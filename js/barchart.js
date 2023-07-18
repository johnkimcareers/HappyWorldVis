class BarChart {

    /**
     * Class constructor with basic chart configuration
     * @param {Object}
     * @param {Array}
     */
    constructor(_config, _data, _dispatcher) {
        // Configuration object with defaults
        this.config = {
            parentElement: _config.parentElement,
            containerWidth: _config.containerWidth || 800,
            containerHeight: _config.containerHeight || 400,
            margin: _config.margin || {top: 25, right: 300, bottom: 70, left: 100},
            legendMargin: {x: 140}
        }
        this.data = _data;
        this.selectedCountriesMap = {};
        this.dispatcher = _dispatcher;
        this.dropDownSelection = 'countries'
        this.groups = ["North America and ANZ", 'Western Europe', 'Central and Eastern Europe', 'Latin America and Caribbean', 'East Asia', 'South Asia', 'Sub-Saharan Africa', 'Middle East and North Africa', 'Southeast Asia', 'Commonwealth of Independent States'];
        this.subGroups = ['regionAverage','countriesAverage'];
        this.initVis();
    }

    /**
     * Initialize scales/axes and append static elements, such as axis titles
     */
    initVis() {
        let vis = this;

        // Calculate inner chart size. Margin specifies the space around the actual chart.
        vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
        vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

        // Initialize scales and axes
        // Important: we flip array elements in the y output range to position the rectangles correctly
        vis.yScale = d3.scaleLinear()
            .domain([0, 8])
            .range([vis.height, 0]);

        vis.xScaleHappy = d3.scaleBand()
            .range([0, vis.width / 2 - 10])
            .paddingInner(0.2);

        vis.xScaleUnhappy = d3.scaleBand()
            .range([vis.width / 2 + 10, vis.width])
            .paddingInner(0.2);

        vis.xAxisHappy = d3.axisBottom(vis.xScaleHappy)
            .ticks(5) // different in update
            .tickSizeOuter(0);

        vis.xAxisUnhappy = d3.axisBottom(vis.xScaleUnhappy)
            .ticks(5) // different in update
            .tickSizeOuter(0);

        vis.yAxis = d3.axisLeft(vis.yScale)
            .ticks(6)
            .tickSizeOuter(0);

        // Define size of SVG drawing area
        vis.svg = d3.select(vis.config.parentElement)
            .attr('width', vis.config.containerWidth)
            .attr('height', vis.config.containerHeight);

        // SVG Group containing the actual chart; D3 margin convention
        vis.chart = vis.svg.append('g')
            .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

        // Append empty x-axis group and move it to the bottom of the chart
        vis.xAxisGHappy = vis.chart.append('g')
            .attr('class', 'barchart-axis x-axis1')
            .attr('transform', `translate(0,${vis.height})`);


        vis.xAxisGUnHappy = vis.chart.append('g')
            .attr('class', 'barchart-axis x-axis2')
            .attr('transform', `translate(0,${vis.height})`);


        // Append y-axis group
        vis.yAxisG = vis.chart.append('g')
            .attr('class', 'barchart-axis y-axis');

        // Append axis title
        vis.svg.append('text')
            .attr('class', 'barchart-axis-title')
            .attr('x', 0)
            .attr('y', 0)
            .attr('dy', '.71em')
            .text('Happiness Score');

        //Create legend group
        vis.legend = vis.svg.append('g')
            .attr('class', 'barchart-legend');
        

        vis.updateVis();
    }

    /**
     * Prepare data and scales before we render it
     */
    updateVis() {
        let vis = this;

        // sort the data from lowest to highest happiness
        const sortedData = vis.data.sort((a,b) => {
            return b.ladder_score - a.ladder_score;
        });

        vis.happiestCountries = [];
        vis.unhappiestCountries = [];

        for (let i = 0; i < 5; i++) {
            let rightPtr = sortedData.length - 1 - i;
            let leftPtr = i;
            let happyCountry = sortedData[leftPtr];
            let unhappyCountry = sortedData[rightPtr];
            vis.happiestCountries.push(happyCountry);
            vis.unhappiestCountries.push(unhappyCountry);
        }

        const selectedCountriesList = Object.values(vis.selectedCountriesMap);

        // take average and change country name to the regional indicator
        const regionalAverageMap = {}

        selectedCountriesList.forEach(d => {
            if (!(d.regional_indicator in regionalAverageMap)) {
                regionalAverageMap[d.regional_indicator] = {
                    'count': 1,
                    'sum': d.ladder_score
                }
            } else {
                regionalAverageMap[d.regional_indicator].count += 1
                regionalAverageMap[d.regional_indicator].sum += d.ladder_score
            }
        });

        let data = []
        if (vis.dropDownSelection === 'region') {
            vis.prepareRegionData(data, regionalAverageMap)

        } else {
            vis.prepareCountryData(data)
        }

        let stackedData = data.map(function(d) {
            let orderedKeys = vis.subGroups.sort(function(a, b) {
                return d[a] - d[b];
            });

            const difference = Math.abs(d.regionAverage - d.countriesAverage);
            if (d.regionAverage < d.countriesAverage) {
                d.countriesAverage = difference;
            } else {
                d.regionAverage = difference;
            }

            let bottom = 0;

            // take absolute difference between two numbers then just give it to the second one
            let result = orderedKeys.map(function(key) {
                let value = d[key];
                let result = [bottom, bottom + value];
                result.data = d;
                result.key = key;
                bottom += value;
                return result;
            });
            result.key = d.region;
            return result;
        });

        // vis.stackedData = stackedData;
        vis.happiestStacks = stackedData.slice(0, 5);
        vis.unhappiestStacks = stackedData.slice(5);

        // Specificy accessor functions
        vis.xValue = d => d.country_name;
        vis.yValue = d => d.ladder_score;
        vis.topKey = d => d.key.concat(d[1].key);
        vis.bottomKey = d => d.key.concat(d[0].key);


        const happiestCountriesNames = vis.happiestCountries.map(d => d.country_name);
        const unhappiestCountriesNames = vis.unhappiestCountries.map(d => d.country_name);
        // Set the scale input domains
        vis.xScaleHappy.domain(happiestCountriesNames);

        vis.xScaleUnhappy.domain(unhappiestCountriesNames);

        vis.renderVis();
    }

    prepareRegionData(data, regionalAverageMap) {
        let vis = this;

        vis.groups.map(d => {
            const countriesAverage = regionalAverageMap[d] ? regionalAverageMap[d].sum / regionalAverageMap[d].count : 0
            let happyRegionAverage = vis.happiestCountries.filter(country => {
                if (country.country_name === d) return country.ladder_score
            })[0]

            let unhappyRegionAverage = vis.unhappiestCountries.filter(country => {
                if (country.country_name === d) return country.ladder_score
            })[0]

            let regionAverage = 0;

            if (happyRegionAverage) {
                regionAverage = happyRegionAverage.ladder_score
            } else if (unhappyRegionAverage) {
                regionAverage = unhappyRegionAverage.ladder_score
            } else {
                regionAverage = 0
            }

            const datum =
                {
                    'region': d,
                    'regionAverage': regionAverage,
                    'countriesAverage': countriesAverage
                }
            data.push(datum)
        })
    }

    prepareCountryData(data) {
        let vis = this;

        vis.happiestCountries.forEach(d => {
            const datum =
                {
                    'region': d.country_name,
                    'regionAverage': 0,
                    'countriesAverage': d.ladder_score
                }

            data.push(datum)
        })

        vis.unhappiestCountries.forEach(d => {
            const datum =
                {
                    'region': d.country_name,
                    'regionAverage': 0,
                    'countriesAverage': d.ladder_score
                }

            data.push(datum)
        })
    }

    /**
     * Bind data to visual elements
     */
    renderVis() {
        let vis = this;

        const topHappyBars = vis.chart.selectAll('.topHappyBar')
            .data(vis.happiestStacks)
            .join('rect')
            .attr('class', d => (vis.dropDownSelection === 'countries' && d.key in vis.selectedCountriesMap) 
                    ? 'topHappyBar bar bar-selected'
                    : 'topHappyBar bar'
                )
            .attr('x', d => vis.xScaleHappy(d.key))
            .attr('width', vis.xScaleHappy.bandwidth())
            .attr('height', d => vis.height - vis.yScale(d[1][1]))
            .attr('y', d => vis.yScale(d[1][1]))
            .attr('fill', d => d[1].key === 'countriesAverage' ? '#ffe054' : '#ffb62c');

        const bottomHappyBars = vis.chart.selectAll('.bottomHappyBar')
            .data(vis.happiestStacks)
            .join('rect')
            .attr('class', 'bottomHappyBar bar')
            .attr('x', d => vis.xScaleHappy(d.key))
            .attr('width', vis.xScaleHappy.bandwidth())
            .attr('height', d => vis.height - vis.yScale(d[0][1]))
            .attr('y', d => vis.yScale(d[0][1]))
            .attr('fill', d => d[1].key === 'countriesAverage' ? '#ffb62c' : '#ffe054');

        const topUnhappyBars = vis.chart.selectAll('.topUnhappyBar')
            .data(vis.unhappiestStacks)
            .join('rect')
            .attr('class',  d => (vis.dropDownSelection === 'countries' && d.key in vis.selectedCountriesMap) 
                    ? 'topUnhappyBar bar bar-selected'
                    : 'topUnhappyBar bar'
                )
            .attr('x', d => vis.xScaleUnhappy(d.key))
            .attr('width', vis.xScaleUnhappy.bandwidth())
            .attr('height', d => vis.height - vis.yScale(d[1][1]))
            .attr('y', d => vis.yScale(d[1][1]))
            .attr('fill', d => d[1].key === 'countriesAverage' ? '#fb2828' : '#FA8B8B');

        const bottomUnhappyBars = vis.chart.selectAll('.bottomUnhappyBar')
            .data(vis.unhappiestStacks)
            .join('rect')
            .attr('class', 'bottomUnhappyBar bar')
            .attr('x', d => vis.xScaleUnhappy(d.key))
            .attr('width', vis.xScaleUnhappy.bandwidth())
            .attr('height', d => vis.height - vis.yScale(d[0][1]))
            .attr('y', d => vis.yScale(d[0][1]))
            .attr('fill', d => d[1].key === 'countriesAverage' ? '#FA8B8B' : '#fb2828');

        vis.xAxisGHappy.call(vis.xAxisHappy).selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "1.5em")
            .attr("dy", "1em")
            .attr("transform", "rotate(-15)");

        vis.xAxisGUnHappy.call(vis.xAxisUnhappy)
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "2em")
            .attr("dy", "1em")
            .attr("transform", "rotate(-15)");
        
        vis.yAxisG.call(vis.yAxis);

        // render legend
        if(vis.dropDownSelection === 'countries') {
            vis.renderLegend(['Happy', 'Unhappy'], [ '#ffe054','#fb2828'], 20);
        } else {
            vis.renderLegend(['Entire Region happy', 'Selected Countries happy',
            'Entire Region unhappy', 'Selected Countries unhappy'], ['#ffb62c','#ffe054','#FA8B8B','#fb2828'], 20);
        }
    }

    renderLegend(_data, colour, size){
        let vis = this;
        
        // create markers;
        vis.legend.selectAll('.barchart-legend-mark')
            .data(_data)
            .join('rect')
            .attr('x', vis.config.legendMargin.x + vis.width)
            .attr('y', (d,i) => {
                return vis.config.margin.top + i*(size+5);
            })
            .attr('height', size)
            .attr('width', size)
            .attr('class', 'barchart-legend-mark')
            .style('fill', (d, i) => {
                return colour[i];
            });
        
        // create text;
        vis.legend.selectAll('.barchart-legend-label')
            .data(_data)
            .join("text")
            .text((d) => {return d;})
            .attr('x', vis.config.legendMargin.x + vis.width + size*1.5)
            .attr('y', (d,i) => {
                return vis.config.margin.top + i*(size+5) + (size/2);
            })
            .attr('fill', 'black')
            .attr('class', 'barchart-legend-label')
            .attr("text-anchor", "left")
            .style("alignment-baseline", "middle");
    }
}