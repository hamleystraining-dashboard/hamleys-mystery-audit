/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Charts Engine — all ECharts logic lives here.
   Generic, registry based: any page can render a chart
   into any container id.
   ========================================================== */

"use strict";

const HamleysTheme = {
    red: "#D71920",
    darkRed: "#A5141A",
    blue: "#4FA8F7",
    green: "#2ECC71",
    yellow: "#F4B400",
    orange: "#FB8C00",
    grey: "#8A9BA8",
    light: "#EEF6FB"
};

const chartRegistry = {};

function commonOptions(){
    return {
        animation: true,
        animationDuration: 600,
        animationEasing: "cubicOut",
        grid: { left: 45, right: 30, top: 40, bottom: 45 },
        tooltip: {
            trigger: "axis",
            backgroundColor: "#ffffff",
            borderColor: "#dddddd",
            borderWidth: 1,
            textStyle: { color: "#233142" }
        }
    };
}

function getChart(containerId){
    if(chartRegistry[containerId]) return chartRegistry[containerId];
    const el = document.getElementById(containerId);
    if(!el) return null;
    const instance = echarts.init(el);
    chartRegistry[containerId] = instance;
    return instance;
}

function formatChartDate(date){
    return new Date(date).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

/* ==========================================================
   TREND (LINE) — used for India Trend, RM/ROM/SD trend,
   monthly trend, store trend
   ========================================================== */

function renderTrendChart(containerId, points, opts = {}){
    const chart = getChart(containerId);
    if(!chart) return;
    if(!points || points.length === 0){
        chart.clear();
        return;
    }
    chart.setOption({
        ...commonOptions(),
        title: opts.title ? { text: opts.title, left: "center", textStyle: { fontSize: 14 } } : undefined,
        xAxis: { type: "category", data: points.map(p => p.label) },
        yAxis: { type: "value", min: 0, max: 100 },
        series: [{
            type: "line",
            smooth: true,
            symbol: "circle",
            symbolSize: 8,
            data: points.map(p => p.value),
            lineStyle: { width: 4, color: opts.color || HamleysTheme.red },
            itemStyle: { color: opts.color || HamleysTheme.red },
            areaStyle: { opacity: 0.15 }
        }]
    }, true);
}

/* ==========================================================
   BAR — used for Regional Performance / group comparisons
   ========================================================== */

function renderBarChart(containerId, entries, opts = {}){
    const chart = getChart(containerId);
    if(!chart) return;
    if(!entries || entries.length === 0){
        chart.clear();
        return;
    }
    chart.setOption({
        ...commonOptions(),
        xAxis: { type: "category", data: entries.map(e => e.name), axisLabel: { rotate: 25 } },
        yAxis: { type: "value", min: 0, max: 100 },
        series: [{
            type: "bar",
            data: entries.map(e => e.average),
            itemStyle: { color: opts.color || HamleysTheme.red, borderRadius: [8, 8, 0, 0] },
            label: { show: true, position: "top" }
        }]
    }, true);
}

/* ==========================================================
   DISTRIBUTION (PIE)
   ========================================================== */

function renderDistributionChart(containerId, buckets){
    const chart = getChart(containerId);
    if(!chart) return;
    chart.setOption({
        tooltip: { trigger: "item" },
        legend: { bottom: 0 },
        series: [{
            type: "pie",
            radius: ["45%", "70%"],
            avoidLabelOverlap: false,
            data: [
                { value: buckets.excellent, name: "90-100", itemStyle: { color: HamleysTheme.green } },
                { value: buckets.good, name: "80-89", itemStyle: { color: HamleysTheme.blue } },
                { value: buckets.average, name: "60-79", itemStyle: { color: HamleysTheme.yellow } },
                { value: buckets.poor, name: "Below 60", itemStyle: { color: HamleysTheme.red } }
            ]
        }]
    }, true);
}

/* ==========================================================
   SECTION PERFORMANCE (RADAR)
   ========================================================== */

function renderSectionChart(containerId, sectionLabels, sectionAverages){
    const chart = getChart(containerId);
    if(!chart) return;
    if(!sectionAverages || sectionAverages.every(v => v === 0)){
        chart.clear();
        return;
    }
    chart.setOption({
        tooltip: {},
        radar: {
            radius: "68%",
            indicator: sectionLabels.map(name => ({ name, max: 100 }))
        },
        series: [{
            type: "radar",
            data: [{
                value: sectionAverages,
                areaStyle: { opacity: 0.25 },
                lineStyle: { color: HamleysTheme.red },
                itemStyle: { color: HamleysTheme.red }
            }]
        }]
    }, true);
}

/* ==========================================================
   RESIZE / DISPOSE
   ========================================================== */

function resizeCharts(){
    Object.values(chartRegistry).forEach(chart => chart && chart.resize());
}

function disposeCharts(){
    Object.values(chartRegistry).forEach(chart => chart && chart.dispose());
    Object.keys(chartRegistry).forEach(key => delete chartRegistry[key]);
}

window.addEventListener("resize", resizeCharts);

/* ==========================================================
   PUBLIC API
   ========================================================== */

window.ChartsAPI = {
    renderTrendChart,
    renderBarChart,
    renderDistributionChart,
    renderSectionChart,
    resize: resizeCharts,
    dispose: disposeCharts,
    theme: HamleysTheme,
    formatDate: formatChartDate
};

console.log("Hamleys Charts Engine Loaded");
