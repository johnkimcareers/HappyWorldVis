class Scatterplot {

    //Draw chart based on the given instructions
    constructor(_config, _data, _dispatcher){
      this.config = {
        parentElement: _config.parentElement,
        containerWidth: _config.containerWidth || 600,
        containerHeight: _config.containerHeight || 400,
        margin: {top: 40, bottom: 50, left: 40, right: 20},
        tooltipPadding: 15
      };
      this.data = _data;
      this.initVis();
      this.dispatcher = _dispatcher;
    }
  
    initVis(){
      let vis = this;

      //set CHART height and width
      vis.width = vis.config.containerWidth - vis.config.margin.left - vis.config.margin.right;
      vis.height = vis.config.containerHeight - vis.config.margin.top - vis.config.margin.bottom;
  
      // select svg drawing area, assign it height and width
      vis.svg = d3.select(vis.config.parentElement)
        .attr('width', vis.config.containerWidth)
        .attr('height', vis.config.containerHeight);
     
      //append chart area, translate so it has margins
      vis.chart = vis.svg.append('g')
        .attr('class', 'vis')
        .attr('transform', `translate(${vis.config.margin.left}, ${vis.config.margin.top})`);
      
      // init scales
      vis.xScale = d3.scaleLinear()
        .range([0, vis.width]);
  
      vis.yScale = d3.scaleLinear()
        .range([vis.height, 0]);

      vis.xScaleGender = d3.scaleBand()
        .domain(['Male', 'Female'])
        .range([0, vis.width]);
      
      //init axes
      vis.xAxis = d3.axisBottom(vis.xScale)
        .ticks(7)
        .tickSizeInner(-vis.height)
        .tickPadding(15);
  
      vis.yAxis = d3.axisLeft(vis.yScale)
        .ticks(10)
        .tickSizeInner(-vis.width)
        .tickPadding(15);

      vis.xAxisGender = d3.axisBottom(vis.xScaleGender)
        .tickSizeInner(-vis.height)
        .tickPadding(15);
      
      //INIT axes groups
      vis.xGroup = vis.chart.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${vis.height})`);
      
      vis.yGroup = vis.chart.append('g')
        .attr('class', 'y-axis');

      vis.xGroupGender = vis.chart.append('g')
        .attr('class', 'x-gender')
        .attr('transform', `translate(0, ${vis.height})`);
    
      // X label title
      vis.xTitle = vis.xGroup.append('text')
        .attr('class', 'scatter-xTitle')
        .attr('x', vis.width/2)
        .attr('y', '40');
  
      // Y Label title
      vis.LeftTitle = vis.yGroup.append('text')
        .attr('class', 'scatter-yTitle')
        .attr('y', '-19')
        .attr('x', '30')
        .attr('text-anchor', 'middle')
        .text('Happiness Score');
    }
  
    updateVis() {
      let vis = this;
      

      // Get attribute we're comparing from drop down
      let sel = document.getElementsByTagName('select')[0];
      vis.xLabel = sel.options[sel.selectedIndex].text;

      vis.activeKey = sel.options[sel.selectedIndex].value;

      //get unique values
      vis.xValue = d => d[vis.activeKey];
      vis.yValue = d => d.ladder_score;
      
      //Update x-axis label;
      if(vis.xLabel === 'Healthy Life Expectancy'){
        vis.xTitle.text('Age');
      } else {
        vis.xTitle.text(vis.xLabel);
      }
      
      // set domain
      vis.yScale.domain([2,d3.max(vis.data, (d) => vis.yValue(d))]);
      vis.xScale.domain([Math.floor(d3.min(vis.data ,(d) => vis.xValue(d))), d3.max(vis.data ,(d) => vis.xValue(d))]);
  
      //call function to render everything
      vis.renderVis();
    }
  
    
    renderVis() {
      let vis = this;

      // render points
      const points = vis.chart.selectAll('.point')
        .data(vis.data)
        .join('circle')
        .attr('class', (d) =>{
          if (d.countrySelect){
            return 'point countrySelect';
          } else {
            return 'point';
          }
        })
        .attr('r', 8)
        .attr('cy', d => vis.yScale(vis.yValue(d)))
        .attr('cx', (d) => {
          if(vis.xLabel != 'Gender of head of government'){
            return vis.xScale(vis.xValue(d));
          } else {
            let y =  vis.xValue(d) === 0 ? vis.xScaleGender('Male') : vis.xScaleGender('Female');
            return y + vis.xScaleGender.bandwidth()/2;
          } 
        });
   
      points.on('click', function (e, d) {
          //call dispatcher
          vis.dispatcher.call('highlightCountries', e, d['country_name']);
      })
      .on('mouseover', (e,d) => { //TOOLTIP ACTIVITY
        if(vis.xLabel != 'Gender of head of government') {
            d3.select('#tooltip')
            .style('display', 'block')
            .html(`<div class="tooltip-scatter"> Country: ${d.country_name} </br>
            ${vis.xTitle.text()} : ${vis.xValue(d).toFixed(2)} </div>`);
        } else { //If showing gender, only indicate country
          d3.select('#tooltip')
            .style('display', 'block')
            .html(`<div class="tooltip-scatter"> Country: ${d.country_name} </br>`);
        }
        })
      .on('mousemove', (e) => {
        d3.select('#tooltip')
          .style('left', (e.pageX + vis.config.tooltipPadding) + 'px')
          .style('top', (e.pageY + vis.config.tooltipPadding) + 'px')
      })
      .on('mouseleave', () => {
        d3.select('#tooltip').style('display', 'none');
      });

      //render axes
      if(vis.xLabel != 'Gender of head of government'){
        // Show quantative axes, hide categorical axes
        d3.select('.x-gender').style('display', 'none');
        d3.select('.x-axis').style('display', 'block');
        vis.xGroup.call(vis.xAxis);
      } else {
        // Show categorical axes, hide quantative axes
        d3.select('.x-axis').style('display', 'none');
        d3.select('.x-gender').style('display', 'block');
        vis.xGroupGender.call(vis.xAxisGender);
      }
      vis.yGroup.call(vis.yAxis);
    }
  }