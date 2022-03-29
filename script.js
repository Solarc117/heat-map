import * as d3 from 'https://cdn.skypack.dev/d3@7'

'use strict'

let { clientWidth: width, clientHeight: height } =
  document.querySelector('.canvas')

const padding = {
    top: 25,
    right: 25,
    bottom: 100,
    left: 100,
  },
  innerWidth = width - padding.left - padding.right,
  innerHeight = height - padding.top - padding.bottom

const xScale = d3.scaleTime(),
  yScale = d3.scaleBand()

const yearFormat = d3.timeFormat('%Y'),
  monthFormat = d3.timeFormat('%B'),
  shortMonthFormat = d3.timeFormat('%b')

const d3svg = d3.select('.canvas'),
  d3graph = d3.select('.graph')

d3graph.append('div').attr('class', 'tooltip')
const mainTooltip = document.querySelector('.tooltip')

const fadeInKeyframes = [
    {
      opacity: 1,
    },
  ],
  fadeOutKeyframes = [
    {
      opacity: 0,
    },
  ],
  options = {
    duration: 500,
    fill: 'forwards',
  }

d3graph.append('div').attr('class', 'legend-tooltip')
const legendTooltip = document.querySelector('.legend-tooltip')

const colorSchemes = [
  ['darkblue', 'red'],
  ['steelblue', 'orangered'],
  ['hsl(219, 100%, 29%)', 'hsl(0, 100%, 47%)'],
  ['darkblue', 'tomato'],
  ['blue', 'red'],
  ['blue', 'orangered'],
  ['darkblue', 'crimson'],
]

function roundHundredth(arg) {
  if (isNaN(arg) || typeof arg !== 'number')
    throw `Invalid argument ${arg}, typeof ${arg}`
  return Math.round(arg * 100) / 100
}

function alertErr(err) {
  console.error('❌', err)
  alert(`Something went wrong 😫 please refresh and try again.`)
}

;(async () => {
  try {
    const { baseTemperature, monthlyVariance } = await d3.json(
      'https://raw.githubusercontent.com/freeCodeCamp/ProjectReferenceData/master/global-temperature.json'
    )

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
      rectHeight = innerHeight / rows

    monthlyVariance.forEach(instance => {
      instance.year = new Date(instance.year, 0)
      instance.month--
    })

    const [minYear, maxYear] = d3.extent(monthlyVariance, instance =>
        instance.year.getFullYear()
      ),
      yearDiff = maxYear - minYear,
      midYear = maxYear - yearDiff / 2

    xScale.domain(d3.extent(monthlyVariance, instance => instance.year))
    // Do I really need the rectWidth for the x range?
    xScale.range([padding.left, padding.left + innerWidth - rectWidth])

    yScale.domain([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    yScale.range([padding.top + innerHeight, padding.top])

    const xAxis = d3.axisBottom(xScale).tickFormat(yearFormat),
      yAxis = d3
        .axisLeft(yScale)
        .tickFormat(monthIndex => shortMonthFormat(new Date(1970, monthIndex)))

    // Color scale.
    const colorScale = d3.scaleLinear(
      d3.extent(monthlyVariance, instance => instance.variance),
      // Maybe allow the user to choose from different color schemes, in case of color blindness or just to look cool?
      // ['darkblue', 'orangered']
      // ['steelblue', 'orangered']
      // ['hsl(219, 100%, 29%)', 'hsl(0, 100%, 47%)']
      // ['darkblue', 'tomato']
      ['blue', 'red']
      // ['blue', 'orangered']
      // ['darkblue', 'crimson']
    )

    // Axes.
    d3svg
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${padding.top + innerHeight + 5})`)
      .call(xAxis)
      .append('text')
      .attr('class', 'axis-title x')
      .text('Year')

    d3svg
      .append('g')
      .attr('class', 'y-axis')
      .attr('transform', `translate(${padding.left - 5}, 0)`)
      .call(yAxis)
      .append('text')
      .attr('class', 'axis-title y')
      .text('Month')

    // Rects and tooltip.
    let stickyTooltip = false,
      fadeOutTimer
    d3svg
      .selectAll('rect')
      .data(monthlyVariance)
      .enter()
      .append('rect')
      .attr('x', instance => xScale(instance.year))
      .attr('y', instance => yScale(instance.month))
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .attr('fill', instance => colorScale(instance.variance))
      .attr('class', 'monthly-var')
      .on('mouseover', ({ target }) => {
        try {
          if (!stickyTooltip) {
            // variance is the difference between currAvg and the baseTemp, month is 0-indexed, and year is a Date() instance.
            clearTimeout(fadeOutTimer)

            let { variance, month, year } = target.__data__,
              { x, y } = target.getBoundingClientRect()
            year = year.getFullYear()
            // getBoundingClientRect() is inconsistent, since its result depends on the current scroll position; to make its return value independent, we add the respective viewport displacement.
            x += window.scrollX
            y += window.scrollY

            let tooltipHTML = `${monthFormat(
              new Date(1970, month)
            )} of ${year}.<br><br>Average temperature of ~<strong>${roundHundredth(
              baseTemperature + variance
            )}°C</strong>. ${
              variance === 0
                ? '<br>Roughly equal to '
                : `<br>~<strong>${Math.abs(
                    roundHundredth(variance)
                  )}°C</strong> ${
                    variance < 0
                      ? `<span style="color: blue;">colder 🥶</span> than`
                      : `<span style="color: red;">hotter 🥵</span> than`
                  }`
            } 
               the base temperature.`

            mainTooltip.innerHTML = tooltipHTML

            const { clientWidth: tooltipWidth, clientHeight: tooltipHeight } =
              mainTooltip

            mainTooltip.style.left = `${
              year < midYear ? x + 20 : x - tooltipWidth - 20
            }px`
            mainTooltip.style.top = `${
              month > 5 ? y - 30 : y - tooltipHeight * 2
            }px`

            mainTooltip.animate(fadeInKeyframes, options)
          }
        } catch (err) {
          alertErr(err)
        }
      })
      .on('mouseout', ({ toElement }) => {
        if (
          toElement &&
          !toElement.classList.contains('monthly-var') &&
          !stickyTooltip
        )
          fadeOutTimer = setTimeout(() => {
            mainTooltip.animate(fadeOutKeyframes, options)
          }, 1000)
      })
      .on('click', event => {
        // Toggle the tooltip's stickiness, and highlight ONLY the current rect if sticky.
        stickyTooltip = !stickyTooltip
        document
          .querySelectorAll('.monthly-var.click-highlight')
          .forEach(rect => rect.classList.remove('click-highlight'))
        if (stickyTooltip) event.target.classList.add('click-highlight')
      })

    // Legend.

    let [minAvg, maxAvg] = d3.extent(
      monthlyVariance,
      instance => instance.variance + baseTemperature
    )

    // For each tick, render a rectangle depicting what color that value maps to.
    const ticks = []
    for (let i = Math.floor(minAvg); i < Math.ceil(maxAvg); i++)
      ticks.push({ avgTemp: i, range: [i, i + 0.99] })
    const legendAxisLength = 350,
      axisDomain = [Math.floor(minAvg), Math.ceil(maxAvg)],
      axisRange = [padding.left, padding.left + legendAxisLength],
      numLegendRects = Math.ceil(maxAvg) - 1,
      legendRectWidth = legendAxisLength / numLegendRects,
      legendRectHeight = 25

    const legendScale = d3.scaleLinear(axisDomain, axisRange),
      legendAxis = d3.axisBottom(legendScale)

    const legendAxisY = height - 35,
      legendAxisX = 10 - padding.left

    d3svg
      .append('g')
      .attr('class', 'legend-axis')
      .attr('transform', `translate(${legendAxisX}, ${legendAxisY})`)
      .call(legendAxis)
      .append('text')
      .attr('class', 'axis-title legend-title')
      .text('Monthly temperature average (°C)')

    // Legend rects.
    let legendTimer
    d3.select('.legend-axis')
      .selectAll('rect')
      .data(ticks)
      .enter()
      .append('rect')
      .attr('class', 'legend-rect')
      .attr('x', data => legendScale(data.avgTemp))
      .attr('y', -legendRectHeight)
      .attr('width', legendRectWidth)
      .attr('height', legendRectHeight)
      .attr('fill', data => colorScale(data.avgTemp - baseTemperature))
      .on('mouseover', ({ target }) => {
        clearTimeout(legendTimer)

        let { x } = target.getBoundingClientRect(),
          { avgTemp, range } = target.__data__
        x += window.scrollX

        legendTooltip.innerHTML = `<strong>${range[0]}°C</strong> - <strong>${range[1]}°C</strong> average temp.`

        const {
          clientWidth: legendTooltipWidth,
          clientHeight: legendTooltipHeight,
        } = legendTooltip
        legendTooltip.style.left = `${
          avgTemp < 8 ? x : x - legendTooltipWidth + legendRectWidth
        }px`
        legendTooltip.style.top = `${
          legendAxisY - legendRectHeight - legendTooltipHeight - 3
        }px`

        legendTooltip.animate(fadeInKeyframes, options)

        // Highlighting the respective rects.
        const rectsInRange = Array.from(
          document.querySelectorAll('.monthly-var')
        ).filter(rect => {
          const currAvg = roundHundredth(
            rect.__data__.variance + baseTemperature
          )
          return currAvg >= range[0] && currAvg <= range[1]
        })

        rectsInRange.forEach(rect => rect.classList.add('highlight'))
      })
      .on('mouseout', ({ toElement }) => {
        Array.from(document.querySelectorAll('.highlight')).forEach(rect =>
          rect.classList.remove('highlight')
        )

        if (toElement && !toElement.classList.contains('legend-rect'))
          legendTimer = setTimeout(() => {
            legendTooltip.animate(fadeOutKeyframes, options)
            setTimeout(() => (legendTooltip.innerHTML = ''), 500)
          }, 1000)
      })
      .on('click', ({ target }) => {
        // Toggle the rectangles within the indicated range.
        const legendRect = target,
          { range } = target.__data__,
          rectsInRange = Array.from(
            document.querySelectorAll('.monthly-var')
          ).filter(rect => {
            const currAvg = roundHundredth(
              rect.__data__.variance + baseTemperature
            )
            return currAvg >= range[0] && currAvg <= range[1]
          })

        rectsInRange.forEach(rect => rect.classList.toggle('fade'))
        legendRect.classList.toggle('fade')
      })

    // Footnotes.
    d3graph
      .append('text')
      .attr('class', 'footnote')
      .text('*Values rounded to the nearest hundredth.')
  } catch (error) {
    alertErr(error)
  }
})()
