class ChoroplethMap {

  /**
   * Class constructor with basic configuration
   * @param {Object}
   * @param {Array}
   */
  constructor(_config, _data, _dispatcher) {
    this.config = {
      parentElement: _config.parentElement,
      containerWidth: _config.containerWidth || 1200,
      containerHeight: _config.containerHeight || 600,
      margin: _config.margin || {top: 0, right: 50, bottom: 50, left: 50},
      tooltipPadding: 10,
      legendBottom: 20,
      legendLeft: 50,
      legendRectHeight: 20, 
      legendRectWidth: 300
    }
    this.selectedCountries = new Set();
    this.data = _data;
    this.dispatcher = _dispatcher;
    this.initVis();
  }
  
  /**
   * We initialize scales/axes and append static elements, such as axis titles.
   */
  initVis() {
    let vis = this;

    // Calculate inner chart size. Margin specifies the space around the actual chart.
    vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
    vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;

    // Define size of SVG drawing area
    vis.svg = d3.select(vis.config.parentElement).append('svg')
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);

    // Append group element that will contain our actual chart 
    // and position it according to the given margin config
    vis.chart = vis.svg.append('g')
        .attr('transform', `translate(${vis.config.margin.left},${vis.config.margin.top})`);

    // Initialize projection and path generator
    vis.projection = d3.geoEquirectangular();
    vis.geoPath = d3.geoPath().projection(vis.projection);

    vis.colorScale = d3.scaleLinear()
        .range(['#ff0000', '#ffff00'])
        .interpolate(d3.interpolateHcl);

    // Initialize gradient that we will later use for the legend
    vis.linearGradient = vis.svg.append('defs').append('linearGradient')
        .attr("id", "legend-gradient");

    // Append legend
    vis.legend = vis.chart.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${vis.config.legendLeft},${vis.height - vis.config.legendBottom})`);
    
    vis.legendRect = vis.legend.append('rect')
        .attr('width', vis.config.legendRectWidth)
        .attr('height', vis.config.legendRectHeight);

    vis.legendTitle = vis.legend.append('text')
        .attr('class', 'legend-title')
        .attr('dy', '.35em')
        .attr('y', -10)
        .text('Happiness Score');

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    const ladderScoreExtent = d3.extent(vis.data.features, d => d.properties.ladder_score);
    
    // Update color scale
    vis.colorScale.domain(ladderScoreExtent);

    // Define begin and end of the color gradient (legend)
    vis.legendStops = [
      { color: '#ff0000', value: ladderScoreExtent[0], offset: 0},
      { color: '#ffff00', value: ladderScoreExtent[1], offset: 100},
    ];

    vis.renderVis();
  }

  renderVis() {
    let vis = this;

    // Defines the scale of the projection so that the geometry fits within the SVG area
    vis.projection.fitSize([vis.width, vis.height], vis.data);

    // Append world map
    const countryPath = vis.chart.selectAll('.choropleth-country')
      .data(vis.data.features)
      .join('path')
        .attr('class', d => (
          vis.selectedCountries.has(d.properties.name) ? 'choropleth-country choropleth-country-select' : 'choropleth-country'
        ))
        .attr('d', vis.geoPath)
        .attr('fill', d => d.properties.ladder_score ? vis.colorScale(d.properties.ladder_score) : 'url(#lightstripe)');

    countryPath.on('click', function (e, d) {
      //call dispatcher
      vis.dispatcher.call('highlightCountries', e, d.properties.name);
    })

    countryPath
      .on('mouseover', (e,d) => {
        d3.select('#tooltip')
          .style('display', 'block')
          .html(`<div class="tooltip-scatter"> Country: ${d.properties.name} </br>
                  Happiness Score: ${d.properties.ladder_score ? d.properties.ladder_score.toFixed(2) : 'n/a'} </div>`);
        })
      .on('mousemove', (e) => {
        d3.select('#tooltip')
          .style('left', (e.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (e.pageY + vis.config.tooltipPadding) + 'px')
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });
    // Add legend labels
    vis.legend.selectAll('.legend-label')
        .data(vis.legendStops)
      .join('text')
        .attr('class', 'legend-label')
        .attr('text-anchor', 'middle')
        .attr('dy', '1em')
        .attr('y', 20)
        .attr('x', (_,index) => {
          return index === 0 ? 0 : vis.config.legendRectWidth;
        })
        .text(d => Math.round(d.value * 10 ) / 10);

    // Update gradient for legend
    vis.linearGradient.selectAll('stop')
        .data(vis.legendStops)
      .join('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

    vis.legendRect.attr('fill', 'url(#legend-gradient)');
  }
}