const axios = require("axios");
const {merge} = require("d3-array");
const {nest} = require("d3-collection");
const {titleCase} = require("d3plus-text");

const columns = ["confirmed", "recovered", "deaths"];
// const levels = ["state", "county", "place"];
const levels = ["state", "county"];

const world = {"Afghanistan": 35530081, "Albania": 2873457, "Algeria": 41318142, "American Samoa": 55641, "Andorra": 76965, "Angola": 29784193, "Antigua and Barbuda": 102012, "Argentina": 44271041, "Armenia": 2930450, "Aruba": 105264, "Australia": 24598933, "Austria": 8809212, "Azerbaijan": 9862429, "Bahamas": 395361, "Bahrain": 1492584, "Bangladesh": 164669751, "Barbados": 285719, "Belarus": 9507875, "Belgium": 11372068, "Belize": 374681, "Benin": 11175692, "Bermuda": 65441, "Bhutan": 807610, "Bolivia": 11051600, "Bosnia and Herzegovina": 3507017, "Botswana": 2291661, "Brazil": 209288278, "British Virgin Islands": 31196, "Brunei": 428697, "Bulgaria": 7075991, "Burkina Faso": 19193382, "Burma": 53370609, "Burundi": 10864245, "Cambodia": 16005373, "Cameroon": 24053727, "Canada": 36708083, "Cape Verde": 546388, "Caribbean": 7284294, "Cayman Islands": 61559, "Central African Republic": 4659080, "Chad": 14899994, "Channel Islands": 165314, "Chile": 18054726, "China": 1386395000, "Colombia": 49065615, "Comoros": 813912, "Costa Rica": 4905769, "Cote d'Ivoire": 24294750, "Croatia": 4125700, "Cuba": 11484636, "Curaçao": 161014, "Cyprus": 1179551, "Czechia": 10591323, "Democratic Republic of the Congo": 81339988, "Denmark": 5769603, "Djibouti": 956985, "Dominica": 73925, "Dominican Republic": 10766998, "Ecuador": 16624858, "Egypt": 97553151, "El Salvador": 6377853, "Equatorial Guinea": 1267689, "Estonia": 1315480, "Eswatini": 1367254, "Ethiopia": 104957438, "Faroe Islands": 49290, "Fiji": 905502, "Finland": 5511303, "France": 67118648, "French Polynesia": 283007, "Gabon": 2025137, "Gambia": 2100568, "Georgia": 3717100, "Germany": 82695000, "Ghana": 28833629, "Gibraltar": 34571, "Greece": 10760421, "Greenland": 56171, "Grenada": 107825, "Guam": 164229, "Guatemala": 16913503, "Guinea-Bissau": 1861283, "Guinea": 12717176, "Guyana": 777859, "Haiti": 10981229, "Honduras": 9265067, "Hong Kong": 7391700, "Hungary": 9781127, "Iceland": 341284, "India": 1339180127, "Indonesia": 263991379, "Iran": 81162788, "Iraq": 38274618, "Ireland": 4813608, "Isle of Man": 84287, "Israel": 8712400, "Italy": 60551416, "Jamaica": 2890299, "Japan": 126785797, "Jordan": 9702353, "Kazakhstan": 18037646, "Kenya": 49699862, "Kiribati": 116398, "Kosovo": 1830700, "Kuwait": 4136528, "Kyrgyzstan": 6201500, "Laos": 6858160, "Latvia": 1940740, "Lebanon": 6082357, "Lesotho": 2233339, "Liberia": 4731906, "Libya": 6374616, "Liechtenstein": 37922, "Lithuania": 2827721, "Luxembourg": 599449, "Macau": 622567, "Madagascar": 25570895, "Malawi": 18622104, "Malaysia": 31624264, "Maldives": 436330, "Mali": 18541980, "Malta": 465292, "Marshall Islands": 53127, "Mauritania": 4420184, "Mauritius": 1264613, "Mexico": 129163276, "Micronesia": 105544, "Moldova": 3549750, "Monaco": 38695, "Mongolia": 3075647, "Montenegro": 622471, "Morocco": 35739580, "Mozambique": 29668834, "Namibia": 2533794, "Nauru": 13649, "Nepal": 29304998, "Netherlands": 17132854, "New Caledonia": 280460, "New Zealand": 4793900, "Nicaragua": 6217581, "Niger": 21477348, "Nigeria": 190886311, "North Korea": 25490965, "North Macedonia": 2083160, "Northern Mariana Islands": 55144, "Norway": 5282223, "Oman": 4636262, "Pakistan": 197015955, "Palau": 21729, "Palestine": 4684777, "Panama": 4098587, "Papua New Guinea": 8251162, "Paraguay": 6811297, "Peru": 32165485, "Philippines": 104918090, "Poland": 37975841, "Portugal": 10293718, "Puerto Rico": 3337177, "Qatar": 2639211, "Republic of the Congo": 5260750, "Romania": 19586539, "Russia": 144495044, "Rwanda": 12208407, "Saint Kitts and Nevis": 55345, "Saint Lucia": 178844, "Saint Martin": 73234, "Saint Vincent and the Grenadines": 109897, "Samoa": 196440, "San Marino": 33400, "Sao Tome and Principe": 204327, "Saudi Arabia": 32938213, "Senegal": 15850567, "Serbia": 7022268, "Seychelles": 95843, "Sierra Leone": 7557212, "Singapore": 5612253, "Slovakia": 5439892, "Slovenia": 2066748, "Solomon Islands": 611343, "Somalia": 14742523, "South Africa": 56717156, "South Korea": 51466201, "South Sudan": 12575714, "Spain": 46572028, "Sri Lanka": 21444000, "Sudan": 40533330, "Suriname": 563402, "Sweden": 10067744, "Switzerland": 8466017, "Syria": 18269868, "Tajikistan": 8921343, "Tanzania": 57310019, "Thailand": 69037513, "Timor-Leste": 1296311, "Togo": 7797694, "Tonga": 108020, "Trinidad and Tobago": 1369125, "Tunisia": 11532127, "Turkey": 80745020, "Turkmenistan": 5758075, "Turks and Caicos Islands": 35446, "Tuvalu": 11192, "Uganda": 42862958, "Ukraine": 44831159, "United Arab Emirates": 9400145, "United Kingdom": 66022273, "United States": 325719178, "Uruguay": 3456750, "Uzbekistan": 32387200, "Vanuatu": 276244, "Venezuela": 31977065, "Vietnam": 95540800, "Virgin Islands": 107268, "Yemen": 28250420, "Zambia": 17094130, "Zimbabwe": 16529904};

const countryNames = {
  "Korea, South": "South Korea",
  "US": "United States"
};

module.exports = function(app) {

  const {db} = app.settings;

  app.get("/api/coronavirus/:level/", async(req, res) => {

    const {level} = req.params;

    const summary = await axios.get("https://api.covid19api.com/summary")
      .then(resp => resp.data);

    const timestamp = summary.Date;


    // SUBNATIONAL DATA REQUESTS
    const requests = columns.map(column => axios.get(`https://api.covid19api.com/country/us/status/${column}`)
      .then(resp => resp.data));

    const payloads = await Promise.all(requests);

    let data = nest()
      .key(d => `${d.Province}_${d.Date}`)
      .entries(merge(payloads))
      .map(group => {
        const d = group.values[0];
        const obj = {
          Geography: d.Province,
          Level: !d.Province.match(/\, [A-Z]{2}$/) ? "state"
            : d.Province.match(/County\, [A-Z]{2}$/) ? "county"
              : "place",
          Date: d.Date.split("T")[0].replace(/\-/g, "/")
        };
        columns.forEach(column => {
          obj[titleCase(column)] = (group.values.find(d => d.Status === column) || {Cases: 0}).Cases;
        });
        return obj;
      });

    if (levels.includes(level)) data = data.filter(d => d.Level === level);

    data = merge(nest()
      .key(d => d.Geography)
      .entries(data)
      .map(group => {
        const index = group.values.findIndex(d => d.Confirmed > 0);
        return group.values.slice(index);
      }));

    const lookup = await db.search
      .findAll({
        where: {
          dimension: "Geography",
          hierarchy: !levels.includes(level) ? levels.map(titleCase) : titleCase(level)
        }
      })
      .then(rows => rows.reduce((obj, d) => {
        obj[d.name] = d.id;
        return obj;
      }, {}));

    const formattedData = data
      .reduce((arr, d) => {
        const name = d.Geography;
        const id = lookup[name];
        if (id) {
          d["ID Geography"] = id;
          arr.push(d);
        }
        return arr;
      }, []);


    // COUNTRY LOOKUP
    const countrySlugs = await axios.get("https://api.covid19api.com/countries")
      .then(resp => resp.data)
      .then(data => data.reduce((obj, d) => {
        obj[d.Country] = d.Slug;
        return obj;
      }, {}));

    const topCountries = summary.Countries
      .sort((a, b) => b.TotalConfirmed - a.TotalConfirmed)
      .filter(d => d.Country !== "US")
      .slice(0, 5)
      .map(d => countrySlugs[d.Country]);

    const countryRequests = merge(topCountries
      .map(country => columns.map(column =>
        axios.get(`https://api.covid19api.com/total/country/${country}/status/${column}`)
          .then(resp => resp.data)
      )));

    const countryPayloads = await Promise.all(countryRequests);

    let countryData = nest()
      .key(d => `${d.Country}_${d.Date}`)
      .entries(merge(countryPayloads))
      .map(group => {
        const d = group.values[0];
        const name = countryNames[d.Country] || d.Country;
        const obj = {
          Geography: name,
          Level: "country",
          Date: d.Date.split("T")[0].replace(/\-/g, "/")
        };
        columns.forEach(column => {
          obj[titleCase(column)] = (group.values.find(d => d.Status === column) || {Cases: 0}).Cases;
        });
        return obj;
      });

    countryData = merge(nest()
      .key(d => d.Geography)
      .entries(countryData.filter(d => world[d.Geography]))
      .map(group => {
        const index = group.values.findIndex(d => d.Confirmed > 0);
        return group.values.slice(index);
      }));

    // POPULATION LOOKUP
    const requestedLevels = (level === "all" ? levels : [level]).map(titleCase);
    const origin = `${ req.protocol }://${ req.headers.host }`;
    const popRequests = requestedLevels.map(level => axios.get(`${origin}/api/data?measures=Population&drilldowns=${level}&year=latest`)
      .then(resp => resp.data.data)
      .then(data => data.map(d => {
        d["ID Geography"] = d[`ID ${level}`];
        return d;
      })));

    const popPayload = await Promise.all(popRequests);

    const populationLookup = merge(popPayload)
      .reduce((obj, d) => {
        obj[d["ID Geography"]] = d.Population;
        return obj;
      }, {});


    // RETURN PAYLOAD
    res.json({
      data: formattedData,
      countries: countryData,
      population: populationLookup,
      timestamp,
      world
    });

  });


};
