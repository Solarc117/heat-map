'use strict';
function log() {
  console.log(...arguments);
}

/**
 * @todo Read the open d3-scale repo README.
 * - I think tomorrow, I should focus on reading more of the D3 documentation; there are still so many methods and scales that I do not understand. Some of the problems that I am facing right now have likely BEEN tackled in some of these methods.
 */

/**
 * This time, instead of removing elements that are dynamic, like in the plot chart and GDP graph, I will check if these components EXIST in the document, and if not, I'll add them.
 * Do I think this approach is better?
 * I think I'll find out by trying it out and comparing it first-hand.
 * But I'll make a hypothesis; this way, the axes' space from the edges of the screen will increase, and the user will be able to scroll through, as if they were using a magnifying glass, which I guess is more like what the user wants to do - to literally ZOOM into the visualization, instead of just showing larger figures. So, I mean, it MIGHT be better. I'll see.
 *
 * ALSO, I should probably try to do as much as I can synchronously, and only add code that absolutely requires the data within the d3.json() method.
 * This should in theory make my code more efficient, because why should code that doesn't need data wait for it?
 *
 * @todo Figure out how to render the axes properly:
 * - I was trying to add a div to help me visualize the innerWidth & innerHeight, so I could use that to properly position my axes. You can continue trying to render that div.inner-area correctly (innerWidth seems to extend beyond the screen for some reason), or just place the axes without it.
 * @todo Figure out why there is no scrolling option when you zoom.
 * @todo Render the innerArea div properly.
 * - Maybe I can append the svg to a div instead of the body, and that way I can append things such as legend divs and titles to THAT div instead of the body? This could keep things more organized.
 * @todo Fix the weird vertical gap and overlap beteen some of the rows.
 * I think I figured out what I need to do to solve this! Just change the yScale from timeScale, which has irregular tick distances, to bandScales, which deal with rows and columns comfortably, and render the ticks with a callback function that converts the 'month' number to a date instance.
 * @todo Why does the svg.canvas disappear behind the footer on zoom?
 * One indirect way to fix this would be to add three modes to the graph:
 *  1. To show everything, as it is right now.
 *  2. To show only the first half of the timelapse.
 *  3. To show the latter half of the timelapse.
 *  - I could have a button on top to switch between these three display modes.
 * Add dynamic rect coloring.
 * @todo Add the color legend for the rects.
 * @todo Add the tooltip.
 */

const bodyHeight = document.body.clientHeight;

let { clientWidth: width, clientHeight: height } =
  document.querySelector('.canvas');
// width *= 1.5;
const padding = {
    top: 25,
    right: 25,
    bottom: 100,
    left: 100,
  },
  innerWidth = width - padding.left - padding.right,
  innerHeight = height - padding.top - padding.bottom;

// A div purely for the purpose of visualizing the innerWidth & innerHeight.
// d3.select('.graph').append('div').attr('class', 'inner-area');
// const innerArea = document.querySelector('.inner-area');
// innerArea.style.width = `${innerWidth}px`;
// innerArea.style.height = `${innerHeight}px`;
// innerArea.style.top = `${padding.top}px`;
// innerArea.style.left = `${padding.left}px`;

const xScale = d3.scaleTime(),
  yScale = d3.scaleTime();

const d3svg = d3.select('.canvas');

// Tooltip.

const d3tooltip = d3.select('.graph').append('div').attr('class', 'tooltip');

d3.json(
  'https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json'
)
  .then(data => {
    const { baseTemperature, monthlyVariance } = data;

    const numRects = monthlyVariance.length,
      // The reducer filters identical items out, which is used to determine how many rows and columns of rects will go in the innerArea, which is used to determine the rects' w/h.
      reducer = (acc, curVal) =>
        acc.includes(curVal) ? [...acc] : [...acc, curVal],
      xAxisTicks = monthlyVariance
        .map(instance => instance.year)
        .reduce(reducer, []).length,
      yAxisTicks = monthlyVariance
        .map(instance => instance.month)
        .reduce(reducer, []).length,
      rows = Math.ceil(numRects / xAxisTicks),
      columns = Math.ceil(numRects / yAxisTicks),
      rectWidth = innerWidth / columns,
      rectHeight = innerHeight / rows;

    monthlyVariance.forEach(instance => {
      // I turn the month into a Date() instance so I can use the timeFormat method to add the ticks.
      instance.year = new Date(instance.year, 0);
      instance.month = new Date(1970, instance.month - 1);
    });

    xScale.domain(d3.extent(monthlyVariance, instance => instance.year));
    xScale.range([padding.left, padding.left + innerWidth - rectWidth]);

    yScale.domain(d3.extent(monthlyVariance, instance => instance.month));
    yScale.range([
      padding.top + innerHeight - rectHeight / 2,
      padding.top + rectHeight / 2,
    ]);

    const xTickFormat = d3.timeFormat('%Y'),
      yTickFormat = d3.timeFormat('%b');

    const xAxis = d3.axisBottom(xScale).tickFormat(xTickFormat),
      yAxis = d3.axisLeft(yScale).tickFormat(yTickFormat);

    // Legend.

    const legendScale = d3.scaleLinear(
      d3.extent(monthlyVariance, instance => instance.variance),
      ['darkblue', 'crimson']
    );

    // Axes.
    d3svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${padding.top + innerHeight + 5})`)
      .call(xAxis);
    d3svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${padding.left - 5}, 0)`)
      .call(yAxis);

    // Rects.
    d3svg
      .selectAll('rect')
      .data(monthlyVariance)
      .enter()
      .append('rect')
      .attr('x', instance => xScale(instance.year))
      .attr('y', instance => yScale(instance.month) - rectHeight / 2)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', instance => legendScale(instance.variance))
      .attr('class', 'rect')
      .on('mouseover', e => {
        const { variance, month, year } = e.target.__data__;
        log(variance, month.getMonth() + 1, year.getFullYear());
      });
  })
  .catch(err => console.error('❌', err));
