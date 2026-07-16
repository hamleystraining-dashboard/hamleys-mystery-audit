/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Charts Engine
   Part 1 of 4
========================================================== */

"use strict";

/* ==========================================================
   CHART INSTANCES
========================================================== */

let indiaTrendChart = null;
let regionalChart = null;
let distributionChart = null;
let sectionChart = null;
let storeTrendChart = null;

/* ==========================================================
   HAMLEYS THEME
========================================================== */

const HamleysTheme = {

    red:"#D71920",

    darkRed:"#A5141A",

    blue:"#4FA8F7",

    green:"#2ECC71",

    yellow:"#F4B400",

    orange:"#FB8C00",

    grey:"#8A9BA8",

    light:"#EEF6FB"

};

/* ==========================================================
   COMMON OPTIONS
========================================================== */

function commonOptions(){

    return{

        animation:true,

        animationDuration:700,

        animationEasing:"cubicOut",

        grid:{

            left:45,

            right:30,

            top:40,

            bottom:45

        },

        tooltip:{

            trigger:"axis",

            backgroundColor:"#ffffff",

            borderColor:"#dddddd",

            borderWidth:1,

            textStyle:{

                color:"#233142"

            }

        },

        legend:{

            top:5

        }

    };

}

/* ==========================================================
   INITIALISE
========================================================== */

function initialiseCharts(){

    indiaTrendChart=createChart(

        "indiaTrendChart"

    );

    regionalChart=createChart(

        "regionalChart"

    );

    distributionChart=createChart(

        "distributionChart"

    );

    sectionChart=createChart(

        "sectionChart"

    );

    storeTrendChart=createChart(

        "storeTrendChart"

    );

}

/* ==========================================================
   CREATE CHART
========================================================== */

function createChart(id){

    const el=document.getElementById(id);

    if(!el) return null;

    return echarts.init(el);

}

/* ==========================================================
   INDIA TREND
========================================================== */

function renderIndiaTrendChart(filters){

    if(!indiaTrendChart) return;

    const history=

        DataServiceAPI

        .getFilteredDataset(filters);

    const x=[];

    const y=[];

    history.forEach(item=>{

        x.push(

            formatDate(item.auditDate)

        );

        y.push(item.overall);

    });

    indiaTrendChart.setOption({

        ...commonOptions(),

        xAxis:{

            type:"category",

            data:x

        },

        yAxis:{

            type:"value",

            min:0,

            max:100

        },

        series:[{

            type:"line",

            smooth:true,

            data:y,

            lineStyle:{

                width:4,

                color:HamleysTheme.red

            },

            areaStyle:{},

            symbolSize:8

        }]

    });

}

/* ==========================================================
   FORMAT DATE
========================================================== */

function formatDate(date){

    return new Date(date)

    .toLocaleDateString(

        "en-IN",

        {

            month:"short",

            day:"numeric"

        }

    );

}/* ==========================================================
   REGIONAL PERFORMANCE
========================================================== */

function renderRegionalChart(data){

    if(!regionalChart) return;

    regionalChart.setOption({

        ...commonOptions(),

        xAxis:{

            type:"category",

            data:data.map(x=>x.rm),

            axisLabel:{

                rotate:25

            }

        },

        yAxis:{

            type:"value",

            min:0,

            max:100

        },

        series:[{

            type:"bar",

            data:data.map(x=>x.average),

            itemStyle:{

                color:HamleysTheme.red,

                borderRadius:[8,8,0,0]

            },

            label:{

                show:true,

                position:"top"

            }

        }]

    });

}

/* ==========================================================
   SCORE DISTRIBUTION
========================================================== */

function renderDistributionChart(data){

    if(!distributionChart) return;

    const buckets={

        excellent:0,

        good:0,

        average:0,

        poor:0

    };

    data.forEach(item=>{

        if(item.overall>=90){

            buckets.excellent++;

        }

        else if(item.overall>=80){

            buckets.good++;

        }

        else if(item.overall>=60){

            buckets.average++;

        }

        else{

            buckets.poor++;

        }

    });

    distributionChart.setOption({

        tooltip:{

            trigger:"item"

        },

        legend:{

            bottom:0

        },

        series:[{

            type:"pie",

            radius:["45%","70%"],

            avoidLabelOverlap:false,

            data:[

                {

                    value:buckets.excellent,

                    name:"90-100",

                    itemStyle:{

                        color:HamleysTheme.green

                    }

                },

                {

                    value:buckets.good,

                    name:"80-89",

                    itemStyle:{

                        color:HamleysTheme.blue

                    }

                },

                {

                    value:buckets.average,

                    name:"60-79",

                    itemStyle:{

                        color:HamleysTheme.yellow

                    }

                },

                {

                    value:buckets.poor,

                    name:"Below 60",

                    itemStyle:{

                        color:HamleysTheme.red

                    }

                }

            ]

        }]

    });

}

/* ==========================================================
   SECTION PERFORMANCE
========================================================== */

function renderSectionChart(data){

    if(!sectionChart) return;

    const totals={

        first:0,

        approach:0,

        needs:0,

        demos:0,

        till:0,

        you:0,

        off:0

    };

    let count=0;

    data.forEach(item=>{

        if(!item.sections) return;

        count++;

        totals.first+=item.sections.firstImpression||0;

        totals.approach+=item.sections.approachingRight||0;

        totals.needs+=item.sections.meetingNeeds||0;

        totals.demos+=item.sections.lostInDemos||0;

        totals.till+=item.sections.tillExperience||0;

        totals.you+=item.sections.youComeFirst||0;

        totals.off+=item.sections.seeingThemOff||0;

    });

    if(count===0) return;

    sectionChart.setOption({

        ...commonOptions(),

        radar:{

            radius:"70%",

            indicator:[

                {name:"First",max:100},

                {name:"Approach",max:100},

                {name:"Needs",max:100},

                {name:"Demos",max:100},

                {name:"Till",max:100},

                {name:"You",max:100},

                {name:"Off",max:100}

            ]

        },

        series:[{

            type:"radar",

            data:[{

                value:[

                    totals.first/count,

                    totals.approach/count,

                    totals.needs/count,

                    totals.demos/count,

                    totals.till/count,

                    totals.you/count,

                    totals.off/count

                ],

                areaStyle:{},

                lineStyle:{

                    color:HamleysTheme.red

                }

            }]

        }]

    });

}/* ==========================================================
   STORE TREND CHART
========================================================== */

function renderStoreTrendChart(storeName){

    if(!storeTrendChart) return;

    if(!storeName || storeName==="All"){

        storeTrendChart.clear();

        return;

    }

    const store=

        DataServiceAPI.findStoreByName(

            storeName

        );

    if(!store) return;

    const history=

        DataServiceAPI.getStoreHistory(

            store.storeCode

        );

    const dates=[];

    const scores=[];

    history.forEach(item=>{

        dates.push(

            formatDate(item.auditDate)

        );

        scores.push(

            item.overall

        );

    });

    storeTrendChart.setOption({

        ...commonOptions(),

        title:{

            text:storeName,

            left:"center",

            textStyle:{

                fontSize:16

            }

        },

        xAxis:{

            type:"category",

            data:dates

        },

        yAxis:{

            type:"value",

            min:0,

            max:100

        },

        series:[{

            type:"line",

            smooth:true,

            symbol:"circle",

            symbolSize:10,

            data:scores,

            lineStyle:{

                width:4,

                color:HamleysTheme.blue

            },

            itemStyle:{

                color:HamleysTheme.red

            },

            areaStyle:{

                opacity:.18

            }

        }]

    });

}

/* ==========================================================
   RESIZE CHARTS
========================================================== */

function resizeCharts(){

    if(indiaTrendChart)

        indiaTrendChart.resize();

    if(regionalChart)

        regionalChart.resize();

    if(distributionChart)

        distributionChart.resize();

    if(sectionChart)

        sectionChart.resize();

    if(storeTrendChart)

        storeTrendChart.resize();

}

/* ==========================================================
   CLEAR CHARTS
========================================================== */

function clearCharts(){

    [

        indiaTrendChart,

        regionalChart,

        distributionChart,

        sectionChart,

        storeTrendChart

    ].forEach(chart=>{

        if(chart)

            chart.clear();

    });

}

/* ==========================================================
   REFRESH ALL CHARTS
========================================================== */

function refreshCharts(filters){

    renderIndiaTrendChart(filters);

    renderRegionalChart(

        DataServiceAPI

        .getDashboardSummary(filters)

        .regionalSummary

    );

    renderDistributionChart(

        DataServiceAPI

        .getFilteredDataset(filters)

    );

    renderSectionChart(

        DataServiceAPI

        .getFilteredDataset(filters)

    );

    renderStoreTrendChart(

        filters.store

    );

}/* ==========================================================
   CHART INITIALISATION
========================================================== */

window.addEventListener("load",()=>{

    initialiseCharts();

});

/* ==========================================================
   EXPORT API
========================================================== */

window.ChartAPI={

    initialise:initialiseCharts,

    refresh:refreshCharts,

    resize:resizeCharts,

    clear:clearCharts,

    renderIndiaTrendChart,

    renderRegionalChart,

    renderDistributionChart,

    renderSectionChart,

    renderStoreTrendChart

};

/* ==========================================================
   THEME SWITCH
========================================================== */

function updateChartTheme(){

    refreshCharts(Dashboard.filters);

}

/* ==========================================================
   BUSINESS TOGGLE
========================================================== */

document.addEventListener("click",(e)=>{

    if(

        e.target.id==="retailToggle" ||

        e.target.id==="playToggle"

    ){

        setTimeout(()=>{

            refreshCharts(

                Dashboard.filters

            );

        },100);

    }

});

/* ==========================================================
   WINDOW RESIZE
========================================================== */

window.addEventListener("resize",()=>{

    resizeCharts();

});

/* ==========================================================
   DESTROY
========================================================== */

function destroyCharts(){

    [

        indiaTrendChart,

        regionalChart,

        distributionChart,

        sectionChart,

        storeTrendChart

    ].forEach(chart=>{

        if(chart){

            chart.dispose();

        }

    });

}

/* ==========================================================
   AUTO REFRESH
========================================================== */

setInterval(()=>{

    if(

        document.visibilityState==="visible"

    ){

        refreshCharts(

            Dashboard.filters

        );

    }

},300000);

/* ==========================================================
   STARTUP
========================================================== */

console.log(

    "Hamleys Charts Engine Loaded"

);
