import geoData from './data/countries-geo.json' assert { type: "json"};

let scatterplot, barChart, choroplethMap;
// global copy of all our data
let globalData; 

// Initialize dispatcher that is used to orchestrate events
const dispatcher = d3.dispatch('highlightCountries', 'highlightRegions');

d3.csv('data/aggData.csv').then(data => {

    data.forEach( d => {
        // get all keys
        let keys = Object.keys(d);
        
        // change all numerical strings to numerical values
        keys.forEach(k => {
          if(k != 'country_name' && k != 'regional_indicator'){
            d[k] = +d[k];
          };
        });

        // use these attributes to toggle classes
        d.countrySelect = false;
      });

    geoData.features.forEach(d => {
        for (let i = 0; i < data.length; i++) {
            if (d.properties.name == data[i].country_name) {
                d.properties.ladder_score = +data[i].ladder_score;
            }
        }
    });

  barChart = new BarChart({parentElement: "#barChart"}, data);

  d3.select('#drop-down-barChart').on('change', (e) => {
    let selection = e.target.value;

    if (selection === 'region') {
      const aggregatedDataMap = d3.rollups(data, v => d3.mean(v, d => d.ladder_score), d => d.regional_indicator);
      const aggregatedDataList = Array.from(aggregatedDataMap, ([country_name, ladder_score]) => ({ country_name, ladder_score }));
      barChart.data = aggregatedDataList;
      barChart.dropDownSelection = 'region';

    } else {
      barChart.data = data;
      barChart.dropDownSelection = 'countries';

    }

    barChart.updateVis();
    // update views here
  })

  choroplethMap = new ChoroplethMap({parentElement: "#choropleth"}, geoData, dispatcher);  
  
  scatterplot = new Scatterplot({parentElement: "#scatter"}, data, dispatcher);
  scatterplot.updateVis();
  document.getElementsByTagName('select')[0].addEventListener("change", () => {
    scatterplot.updateVis();
  });
  
  globalData = data;
})
.catch(error => console.error(error));

dispatcher.on('highlightCountries', selectedCountry => {

   globalData.forEach(d => {
    if(d['country_name'] === selectedCountry) {
      d.countrySelect = !d.countrySelect;

      selectedCountry in barChart.selectedCountriesMap
        ? delete barChart.selectedCountriesMap[selectedCountry]
        : barChart.selectedCountriesMap[selectedCountry] = d;
    }

    choroplethMap.selectedCountries.has(selectedCountry) 
      ? choroplethMap.selectedCountries.delete(selectedCountry) 
      : choroplethMap.selectedCountries.add(selectedCountry);
   });
  
  barChart.updateVis();
  choroplethMap.updateVis();
  scatterplot.updateVis();
})