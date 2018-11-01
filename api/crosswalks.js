const axios = require("axios");

const loadJSON = require("../utils/loadJSON");

const universitySimilar = loadJSON("/static/data/similar_universities.json");
const napcs2sctg = loadJSON("/static/data/nacps2sctg.json");

const {CANON_API} = process.env;

module.exports = function(app) {

  const {cache, db} = app.settings;

  app.get("/api/cip/parent/:id/:level", (req, res) => {

    const {id, level} = req.params;
    const depth = parseInt(level.slice(3), 10);
    const parentId = id.slice(0, depth);
    db.search
      .findOne({where: {id: parentId, dimension: "CIP"}})
      .then(cip => {
        res.json(cip);
      })
      .catch(err => res.json(err));

  });

  app.get("/api/university/similar/:id", (req, res) => {

    const ids = universitySimilar[req.params.id] || [];

    db.search
      .findAll({where: {id: ids, dimension: "University"}})
      .then(universities => {
        res.json(universities);
      })
      .catch(err => res.json(err));

  });

  app.get("/api/university/opeid/:id", (req, res) => {

    res.json({opeid: cache.opeid[req.params.id]});

  });

  app.get("/api/napcs/:id/sctg", (req, res) => {

    const ids = napcs2sctg[req.params.id] || [];
    res.json(ids.map(d => cache.sctg[d] || {id: d}));

  });

  /**
   * To handle the sentence: "The most common jobs for people who hold a degree in one of the 
   * 5 most specialized majors at University," requires that we construct an API request 
   * WITH THOSE 5 MAJORS in the url. This crosswalk is responsible for constructing that request.
   */
  app.get("/api/university/commonJobLookup/:id", (req, res) => {
    const {id} = req.params;
    const cipURL = `${CANON_API}/api/data?University=${id}&measures=Completions,yuc%20RCA&year=latest&drilldowns=CIP2&order=yuc%20RCA&sort=desc`;
    axios.get(cipURL).then(resp => {
      const CIP2 = resp.data.data.slice(0, 5).map(d => d["ID CIP2"]).join();
      const logicUrl = `${CANON_API}/api/data?measures=Total%20Population,Record%20Count&year=latest&drilldowns=CIP2,Detailed%20Occupation&order=Total%20Population&sort=desc&Workforce%20Status=true&Employment%20Time%20Status=1&Record%20Count%3E=5&CIP2=${CIP2}`;
      axios.get(logicUrl).then(resp => {
        const dedupedJobs = [];
        const jobList = resp.data.data;
        // The jobList has duplicates. For example, if a Biology Major becomes a Physician, and a separate
        // Science major becomes a Physician, these are listed as separate data points. These must be folded
        // together under one "Physician" to create an accurate picture of "jobs held by graduates with X degrees"
        jobList.forEach(d => {
          const thisJob = dedupedJobs.find(j => j["Detailed Occupation"] === d["Detailed Occupation"]);
          if (thisJob) {
            thisJob["Total Population"] += d["Total Population"];
          }
          else {
            dedupedJobs.push(d);
          } 
        });
        dedupedJobs.sort((a, b) => b["Total Population"] - a["Total Population"]);
        res.json({data: dedupedJobs.slice(0, 10)}).end();
      });
    });
  });

  /**
   * To handle the sentence: "The highest paying jobs for people who hold a degree in one of the 
   * 5 most specialized majors at University."
   */
  app.get("/api/university/highestWageLookup/:id", (req, res) => {
    const {id} = req.params;
    const cipURL = `${CANON_API}/api/data?University=${id}&measures=Completions,yuc%20RCA&year=latest&drilldowns=CIP2&order=yuc%20RCA&sort=desc`;
    axios.get(cipURL).then(resp => {
      const CIP2 = resp.data.data.slice(0, 5).map(d => d["ID CIP2"]).join();
      const logicUrl = `${CANON_API}/api/data?measures=Average%20Wage,Record%20Count&year=latest&drilldowns=CIP2,Detailed%20Occupation&order=Average%20Wage&sort=desc&Workforce%20Status=true&Employment%20Time%20Status=1&Record%20Count%3E=5&CIP2=${CIP2}`;
      axios.get(logicUrl).then(resp => {
        const dedupedWages = [];
        const wageList = resp.data.data;
        wageList.forEach(d => {
          if (dedupedWages.length < 5 && !dedupedWages.find(w => w["Detailed Occupation"] === d["Detailed Occupation"])) dedupedWages.push(d);
        });
        res.json({data: dedupedWages.slice(0, 10)}).end();
      });
    });
  });

  /**
   * To handle the sentence: "The most common industries for people who hold a degree in one 
   * of the 5 most specialized majors at University."
   */
  app.get("/api/university/commonIndustryLookup/:id", (req, res) => {
    const {id} = req.params;
    const cipURL = `${CANON_API}/api/data?University=${id}&measures=Completions,yuc%20RCA&year=latest&drilldowns=CIP2&order=yuc%20RCA&sort=desc`;
    axios.get(cipURL).then(resp => {
      const CIP2 = resp.data.data.slice(0, 5).map(d => d["ID CIP2"]).join();
      const logicUrl = `${CANON_API}/api/data?measures=Total%20Population,Record%20Count&year=latest&drilldowns=CIP2,Industry%20Group&order=Total%20Population&Workforce%20Status=true&Employment%20Time%20Status=1&sort=desc&Record%20Count>=5&CIP2=${CIP2}`;
      axios.get(logicUrl).then(resp => {
        const dedupedIndustries = [];
        const industryList = resp.data.data;
        // The industryList has duplicates. For example, if a Biology Major enters Biotech, and a separate
        // Science major enters Biotech, these are listed as separate data points. These must be folded
        // together under one "Biotech" to create an accurate picture of "industries entered by graduates with X degrees"
        industryList.forEach(d => {
          const thisIndustry = dedupedIndustries.find(j => j["Industry Group"] === d["Industry Group"]);
          if (thisIndustry) {
            thisIndustry["Total Population"] += d["Total Population"];
          }
          else {
            dedupedIndustries.push(d);
          }
        });
        dedupedIndustries.sort((a, b) => b["Total Population"] - a["Total Population"]);
        res.json({data: dedupedIndustries.slice(0, 10)}).end();
      });
    });
  }); 

  app.get("/api/neighbors", async(req, res) => {

    const {dimension, drilldowns, id, limit = 5} = req.query;

    const attr = await db.search.findOne({where: {dimension, id}});
    const {hierarchy} = attr;

    req.query.limit = 10000;
    const measure = req.query.measure || req.query.measures;
    if (req.query.measure) {
      req.query.measures = req.query.measure;
      delete req.query.measure;
    }
    delete req.query.dimension;
    delete req.query.id;
    if (!req.query.order) {
      req.query.order = measure.split(",")[0];
      req.query.sort = "desc";
    }

    if (!req.query.Year && !req.query.year) req.query.Year = "latest";

    if (!drilldowns) {
      req.query.drilldowns = hierarchy;
    }
    else if (!drilldowns.includes(hierarchy)) {
      req.query.drilldowns += `,${hierarchy}`;
    }

    const params = Object.entries(req.query).map(([key, val]) => `${key}=${val}`).join("&");
    const logicUrl = `${CANON_API}/api/data?${params}`;

    const resp = await axios.get(logicUrl)
      .then(resp => resp.data);

    if (resp.error) res.json(resp);

    const list = resp.data;

    const entry = list.find(d => d[`ID ${hierarchy}`] === id);
    const index = list.indexOf(entry);
    let data;

    if (index <= limit / 2 + 1) {
      data = list.slice(0, limit);
    }
    else if (index > list.length - limit / 2 - 1) {
      data = list.slice(-limit);
    }
    else {
      const min = Math.ceil(index - limit / 2);
      data = list.slice(min, min + limit);
    }

    data.forEach(d => {
      d.Rank = list.indexOf(d) + 1;
    });

    res.json({data, source: resp.source});

  });


};
