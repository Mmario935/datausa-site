const FUNC = require("../utils/FUNC"),
      axios = require("axios"),
      libs = require("../utils/libs"), // leave this! needed for the variable functions
      mortarEval = require("../utils/mortarEval"),
      selSwap = require("../utils/selSwap"),
      urlSwap = require("../utils/urlSwap"),
      varSwap = require("../utils/varSwap");

const profileReqWithGens = {
  // logging: console.log,
  include: [
    {association: "generators", separate: true},
    {association: "materializers", separate: true},
    {association: "visualizations", separate: true},
    {association: "stats", separate: true},
    {association: "descriptions", separate: true},
    {
      association: "sections", separate: true,
      include: [
        {association: "subtitles", separate: true},
        {association: "descriptions", separate: true},
        {
          association: "topics", separate: true,
          include: [
            {association: "subtitles", separate: true},
            {association: "descriptions", separate: true},
            {association: "visualizations", separate: true},
            {association: "stats", separate: true},
            {association: "selectors", separate: true}
          ]
        }
      ]
    }
  ]
};

const profileReq = {
  include: [
    {association: "visualizations", separate: true},
    {association: "stats", separate: true},
    {association: "descriptions", separate: true},
    {
      association: "sections", separate: true,
      include: [
        {association: "subtitles", separate: true},
        {association: "descriptions", separate: true},
        {
          association: "topics", separate: true,
          include: [
            {association: "subtitles", separate: true},
            {association: "descriptions", separate: true},
            {association: "visualizations", separate: true},
            {association: "stats", separate: true},
            {association: "selectors", separate: true}
          ]
        }
      ]
    }
  ]
};

const topicReq = [
  {association: "subtitles", separate: true},
  {association: "descriptions", separate: true},
  {association: "visualizations", separate: true},
  {association: "stats", separate: true},
  {association: "selectors", separate: true}
];

// Using nested ORDER BY in the massive includes is incredibly difficult so do it manually here. Eventually move it up to the query.
const sortProfile = profile => {
  const sorter = (a, b) => a.ordering - b.ordering;
  profile = profile.toJSON();
  if (profile.descriptions) profile.descriptions.sort(sorter);
  if (profile.sections) {
    profile.sections.sort(sorter);
    profile.sections.map(section => {
      if (section.subtitles) section.subtitles.sort(sorter);
      if (section.descriptions) section.descriptions.sort(sorter);
      if (section.topics) {
        section.topics.sort(sorter);
        section.topics.map(topic => {
          if (topic.subtitles) topic.subtitles.sort(sorter);
          if (topic.descriptions) topic.descriptions.sort(sorter);
        });
      }
    });
  }
  return profile;
};

module.exports = function(app) {

  const {cache, db} = app.settings;

  app.get("/api/internalprofile/all", (req, res) => {
    db.profiles.findAll(profileReqWithGens).then(profiles => {
      profiles = profiles.map(profile => sortProfile(profile));
      res.json(profiles).end();
    });
  });

  app.get("/api/internalprofile/:slug", (req, res) => {
    const {slug} = req.params;
    const reqObj = Object.assign({}, profileReq, {where: {slug}});
    db.profiles.findOne(reqObj).then(profile => res.json(sortProfile(profile)).end());
  });

  app.get("/api/variables/:slug/:id", (req, res) => {
    const {slug, id} = req.params;

    // Begin by fetching the profile by slug, and all the generators that belong to that profile
    /* Potential TODO here: Later in this function we manually get generators and materializers.
     * Maybe refactor this to get them immediately in the profile get using include.
     */
    db.profiles.findOne({where: {slug}, raw: true})
      .then(profile =>
        Promise.all([profile.id, db.search.findOne({where: {id, type: slug}}), db.formatters.findAll(), db.generators.findAll({where: {profile_id: profile.id}})])
      )
      // Given a profile id and its generators, hit all the API endpoints they provide
      .then(resp => {
        const [pid, attr, formatters, generators] = resp;
        // Create a hash table so the formatters are directly accessible by name
        const formatterFunctions = formatters.reduce((acc, f) => (acc[f.name.replace(/^\w/g, chr => chr.toLowerCase())] = Function("n", "libs", "formatters", f.logic), acc), {});
        // Deduplicate generators that share an API endpoint
        const requests = Array.from(new Set(generators.map(g => g.api)));
        // Generators use <id> as a placeholder. Replace instances of <id> with the provided id from the URL
        // The .catch here is to handle malformed API urls, returning an empty object
        const fetches = requests.map(r => axios.get(urlSwap(r, {...req.params, ...cache, ...attr})).catch(() => ({})));
        return Promise.all([pid, generators, requests, formatterFunctions, Promise.all(fetches)]);
      })
      // Given a profile id, its generators, their API endpoints, and the responses of those endpoints,
      // start to build a returnVariables object by executing the javascript of each generator on its data
      .then(resp => {
        const [pid, generators, requests, formatterFunctions, results] = resp;
        let returnVariables = {};
        const genStatus = {};
        results.forEach((r, i) => {
          // For every API result, find ONLY the generators that depend on this data
          const requiredGenerators = generators.filter(g => g.api === requests[i]);
          // Build the return object using a reducer, one generator at a time
          returnVariables = requiredGenerators.reduce((acc, g) => {
            const evalResults = mortarEval("resp", r.data, g.logic, formatterFunctions);
            const {vars} = evalResults;
            // genStatus is used to track the status of each individual generator
            genStatus[g.id] = evalResults.error ? {error: evalResults.error} : evalResults.vars;
            // Fold the generated variables into the accumulating returnVariables
            return {...returnVariables, ...vars};
          }, returnVariables);
        });
        returnVariables._genStatus = genStatus;
        return Promise.all([returnVariables, formatterFunctions, db.materializers.findAll({where: {profile_id: pid}, raw: true})]);
      })
      // Given the partially built returnVariables and all the materializers for this profile id,
      // Run the materializers and fold their generated variables into returnVariables
      .then(resp => {
        let returnVariables = resp[0];
        const formatterFunctions = resp[1];
        const materializers = resp[2];
        // The order of materializers matter because input to later materializers depends on output from earlier materializers
        materializers.sort((a, b) => a.ordering - b.ordering);
        let matStatus = {};
        returnVariables = materializers.reduce((acc, m) => {
          const evalResults = mortarEval("variables", acc, m.logic, formatterFunctions);
          const {vars} = evalResults;
          matStatus[m.id] = evalResults.error ? {error: evalResults.error} : evalResults.vars;
          return {...acc, ...vars};
        }, returnVariables);
        returnVariables._matStatus = matStatus;
        return res.json(returnVariables).end();
      });
  });

  /* Main API Route to fetch a profile, given a slug and an id
   * slugs represent the type of page (geo, naics, soc, cip, university)
   * ids represent actual entities / locations (nyc, bu)
  */

  app.get("/api/profile/:slug/:id", (req, res) => {
    const {slug, id} = req.params;
    const origin = `http${ req.connection.encrypted ? "s" : "" }://${ req.headers.host }`;

    /* The following Promises, as opposed to being nested, are run sequentially.
     * Each one returns a new promise, whose response is then handled in the following block
     * Note that this means if any info from a given block is required in any later block,
     * We must pass that info as one of the arguments of the returned Promise.
    */

    Promise.all([axios.get(`${origin}/api/variables/${slug}/${id}`), db.formatters.findAll()])

      // Given the completely built returnVariables and all the formatters (formatters are global)
      // Get the ACTUAL profile itself and all its dependencies and prepare it to be formatted and regex replaced
      // See profileReq above to see the sequelize formatting for fetching the entire profile
      .then(resp => {
        const variables = resp[0].data;
        const formatters = resp[1];
        const formatterFunctions = formatters.reduce((acc, f) => (acc[f.name.replace(/^\w/g, chr => chr.toLowerCase())] = Function("n", "libs", "formatters", f.logic), acc), {});
        const request = axios.get(`${origin}/api/internalprofile/${slug}`);
        return Promise.all([variables, formatterFunctions, request]);
      })
      // Given a returnObject with completely built returnVariables, a hash array of formatter functions, and the profile itself
      // Go through the profile and replace all the provided {{vars}} with the actual variables we've built
      .then(resp => {
        let returnObject = {};
        const variables = resp[0];
        const formatterFunctions = resp[1];
        // Create a "post-processed" profile by swapping every {{var}} with a formatted variable
        const profile = varSwap(resp[2].data, formatterFunctions, variables);
        returnObject.pid = id;
        // Helper functions for filtering and variable swapping
        const allowed = obj => variables[obj.allowed] || obj.allowed === null || obj.allowed === "always";
        const swapper = obj => varSwap(obj, formatterFunctions, variables);
        // The varswap function is not recursive. We have to do some work here to crawl down the profile
        // and run the varswap at each level.
        if (profile.sections) {
          profile.sections = profile.sections
            .filter(allowed)
            .map(s => {
              if (s.subtitles) s.subtitles = s.subtitles.filter(allowed).map(swapper);
              if (s.descriptions) s.descriptions = s.descriptions.filter(allowed).map(swapper);
              if (s.topics) {
                s.topics = s.topics
                  .filter(allowed)
                  .map(t => {
                    // If this topic has selectors (a drop-down menu), then the topic's content will contain
                    // elements like [[selectorName]]. Use selSwap to replace these with the default BEFORE varSwap
                    // First, filter each selector's option list to include only allowed options.
                    t.selectors ? t.selectors.forEach(s => s.options = s.options.filter(allowed)) : t.selectors = [];
                    // Next, make an array of "swap" tuples to be passed to selSwap
                    const selectors = t.selectors.map(s => ({name: s.name, option: s.default}));
                    const select = obj => selSwap(obj, selectors);
                    t = selSwap(t, selectors);
                    if (t.subtitles) t.subtitles = t.subtitles.filter(allowed).map(select).map(swapper);
                    if (t.descriptions) t.descriptions = t.descriptions.filter(allowed).map(select).map(swapper);
                    if (t.visualizations) {
                      t.visualizations = t.visualizations
                        .filter(allowed)
                        .map(select)
                        .map(v => {
                          const evalResults = mortarEval("variables", variables, v.logic, formatterFunctions);
                          const {vars} = evalResults;
                          return FUNC.objectify(vars);
                        });
                    }
                    if (t.stats) t.stats = t.stats.filter(allowed).map(select).map(swapper);
                    return varSwap(t, formatterFunctions, variables);
                  });
              }
              return varSwap(s, formatterFunctions, variables);
            });
        }
        if (profile.visualizations) {
          profile.visualizations = profile.visualizations
            .filter(allowed)
            .map(v => {
              const evalResults = mortarEval("variables", variables, v.logic, formatterFunctions);
              const {vars} = evalResults;
              return FUNC.objectify(vars);
            });
        }
        if (profile.stats) profile.stats = profile.stats.filter(allowed).map(swapper);
        if (profile.descriptions) profile.descriptions = profile.descriptions.filter(allowed).map(swapper);
        returnObject = Object.assign({}, returnObject, profile);
        return Promise.all([returnObject, formatterFunctions, db.visualizations.findAll({where: {owner_type: "profile", owner_id: profile.id}})]);
      })
      .then(resp => {
        res.json(resp[0]).end();
      })
      .catch(err => {
        console.error("Error!", err);
      });

  });

  // Endpoint for when a user selects a new dropdown for a topic, requiring new variables
  app.get("/api/topic/:slug/:id/:topic_id", (req, res) => {
    const {slug, id, topic_id} = req.params;
    const origin = `http${ req.connection.encrypted ? "s" : "" }://${ req.headers.host }`;
    // As with profiles above, we need formatters, variables, and the topic itself in order to
    // create a "postProcessed" topic that can be returned to the requester.
    const getVariables = axios.get(`${origin}/api/variables/${slug}/${id}`);
    const getFormatters = db.formatters.findAll();
    const getTopic = db.topics.findOne({where: {id: topic_id}, include: topicReq});

    Promise.all([getVariables, getFormatters, getTopic]).then(resp => {
      const variables = resp[0].data;
      const formatters = resp[1];
      const topic = resp[2].toJSON();
      const formatterFunctions = formatters.reduce((acc, f) => (acc[f.name.replace(/^\w/g, chr => chr.toLowerCase())] = Function("n", "libs", "formatters", f.logic), acc), {});
      const allowed = obj => variables[obj.allowed] || obj.allowed === null || obj.allowed === "always";
      // First, filter the dropdown array to only include allowed options
      topic.selectors ? topic.selectors.forEach(s => s.options = s.options.filter(allowed)) : topic.selectors = [];
      // From the available dropdowns for this topic, create an array of the following format:
      // {name: ThingToReplace, option: ThingToReplaceItWith}
      // If the ?name=option in the query params was correct, use it, otherwise use the default.
      const selectors = topic.selectors.map(s => {
        if (s.options.map(s => s.option).includes(req.query[s.name])) {
          return {name: s.name, option: req.query[s.name]};
        }
        else {
          return {name: s.name, option: s.default};
        }
      });
      // Remember: execute selSwap BEFORE varSwap. This ensures that instances of {{[[selector]]}}
      // in the CMS can properly be selSwap'd to {{option}}, then THAT can be run through varSwap.
      const processedTopic = varSwap(selSwap(topic, selectors), formatterFunctions, variables);
      const swapper = obj => varSwap(obj, formatterFunctions, variables);
      const select = obj => selSwap(obj, selectors);
      const sorter = (a, b) => a.ordering - b.ordering;
      ["subtitles", "descriptions", "stats", "visualizations"].forEach(key => {
        if (processedTopic[key]) processedTopic[key] = processedTopic[key].filter(allowed).map(select).map(swapper).sort(sorter);
      });
      res.json(processedTopic).end();
    });
  });

};
