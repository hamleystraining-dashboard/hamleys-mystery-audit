/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Global Application Controller
   Version 2.0
========================================================== */

"use strict";

/* ==========================================================
   GLOBAL STATE
========================================================== */

const App = {

    business: "retail",

    currentPage: "overview",

    selectedRM: null,

    selectedROM: null,

    selectedSD: null,

    selectedStore: null

};

/* ==========================================================
   INITIALISE APPLICATION
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    initialiseApplication();

});

/* ==========================================================
   APP START
========================================================== */

function initialiseApplication(){

    initialiseNavigation();

    initialiseBusinessToggle();

    initialiseDates();

    animateCards();

    console.log("Hamleys Mystery Audit Intelligence Loaded");

}

/* ==========================================================
   NAVIGATION
========================================================== */

function initialiseNavigation(){

    const navItems=document.querySelectorAll(".nav-item");

    navItems.forEach(item=>{

        item.addEventListener("click",function(){

            navItems.forEach(i=>i.classList.remove("active"));

            this.classList.add("active");

            const page=this.innerText.trim();

            changeWorkspace(page);

        });

    });

}

/* ==========================================================
   CHANGE WORKSPACE
========================================================== */

function changeWorkspace(page){

    App.currentPage=page;

    const title=document.getElementById("workspaceTitle");

    const subtitle=document.getElementById("workspaceSubtitle");

    const label=document.getElementById("hierarchyLabel");

    if(!title) return;

    switch(page){

        case "RM Wise":

            title.innerText="RM Performance";

            subtitle.innerText="Performance of Regional Managers";

            label.innerText="RM";

        break;

        case "ROM Wise":

            title.innerText="ROM Performance";

            subtitle.innerText="Performance of Regional Operations Managers";

            label.innerText="ROM";

        break;

        case "SD Wise":

            title.innerText="Store Director Performance";

            subtitle.innerText="Performance by Store Director";

            label.innerText="Store Director";

        break;

        case "Store Wise":

            title.innerText="Store Performance";

            subtitle.innerText="Performance by Store";

            label.innerText="Store";

        break;

        default:

            title.innerText="Executive Dashboard";

            subtitle.innerText="National Mystery Audit Overview";

            label.innerText="Hierarchy";

    }

}

/* ==========================================================
   RETAIL / PLAY
========================================================== */

function initialiseBusinessToggle(){

    const retail=document.getElementById("retailToggle");

    const play=document.getElementById("playToggle");

    if(!retail || !play) return;

    retail.addEventListener("click",()=>{

        App.business="retail";

        retail.classList.add("active");

        play.classList.remove("active");

        refreshBusiness();

    });

    play.addEventListener("click",()=>{

        App.business="play";

        play.classList.add("active");

        retail.classList.remove("active");

        refreshBusiness();

    });

}

/* ==========================================================
   REFRESH BUSINESS
========================================================== */

function refreshBusiness(){

    console.log("Business Changed :",App.business);

    document.body.setAttribute(

        "data-business",

        App.business

    );

    updateSectionNames();

}

/* ==========================================================
   SECTION LIST
========================================================== */

function updateSectionNames(){

    const section=document.getElementById(

        "sectionFilter"

    );

    if(!section) return;

    section.innerHTML="";

    let sections=[];

    if(App.business==="retail"){

        sections=[

            "All Sections",

            "First Impression",

            "Approaching Right",

            "Meeting Thy Needs",

            "Lost In Demos",

            "Till Experience",

            "You Come First",

            "Seeing Them Off"

        ];

    }

    else{

        sections=[

            "All Sections",

            "Attraction",

            "Welcome",

            "Entry Assistance",

            "Magic Pillars",

            "Activities",

            "Birthday",

            "Farewell"

        ];

    }

    sections.forEach(item=>{

        const option=document.createElement("option");

        option.text=item;

        option.value=item;

        section.appendChild(option);

    });

}

/* ==========================================================
   DATE FILTER
========================================================== */

function initialiseDates(){

    const from=document.getElementById("fromDate");

    const to=document.getElementById("toDate");

    if(!from || !to) return;

    const today=new Date();

    const first=new Date(today.getFullYear(),0,1);

    from.valueAsDate=first;

    to.valueAsDate=today;

}/* ==========================================================
   CARD ANIMATIONS
========================================================== */

function animateCards(){

    const cards=document.querySelectorAll(

        ".kpi-card,.summary-card,.chart-card,.performance-card,.profile-card,.workspace-kpi"

    );

    cards.forEach((card,index)=>{

        card.style.opacity="0";

        card.style.transform="translateY(20px)";

        setTimeout(()=>{

            card.style.transition="all .45s ease";

            card.style.opacity="1";

            card.style.transform="translateY(0px)";

        },index*60);

    });

}

/* ==========================================================
   KPI COUNT UP
========================================================== */

function animateNumber(id,target){

    const element=document.getElementById(id);

    if(!element) return;

    let current=0;

    const increment=Math.max(1,Math.ceil(target/40));

    const timer=setInterval(()=>{

        current+=increment;

        if(current>=target){

            current=target;

            clearInterval(timer);

        }

        element.innerText=current;

    },20);

}

/* ==========================================================
   SAMPLE DASHBOARD
========================================================== */

function loadSampleKPIs(){

    animateNumber("avgScore",92);

    animateNumber("storesAudited",104);

    animateNumber("below80",8);

    animateNumber("below60",2);

    animateNumber("openCases",5);

    const india=document.getElementById(

        "overallIndiaScore"

    );

    if(india){

        india.innerText="92%";

    }

}

/* ==========================================================
   TOAST NOTIFICATION
========================================================== */

function showToast(message,type="success"){

    let toast=document.getElementById("toast");

    if(!toast){

        toast=document.createElement("div");

        toast.id="toast";

        toast.style.position="fixed";

        toast.style.right="30px";

        toast.style.bottom="30px";

        toast.style.padding="14px 24px";

        toast.style.borderRadius="12px";

        toast.style.color="#fff";

        toast.style.fontWeight="600";

        toast.style.zIndex="9999";

        toast.style.boxShadow="0 10px 25px rgba(0,0,0,.25)";

        document.body.appendChild(toast);

    }

    switch(type){

        case "error":

            toast.style.background="#e53935";

        break;

        case "warning":

            toast.style.background="#f4b400";

        break;

        default:

            toast.style.background="#2ecc71";

    }

    toast.innerText=message;

    toast.style.opacity="1";

    toast.style.display="block";

    setTimeout(()=>{

        toast.style.opacity="0";

    },2500);

}

/* ==========================================================
   LOADING OVERLAY
========================================================== */

function showLoader(){

    const loader=document.createElement("div");

    loader.id="globalLoader";

    loader.innerHTML="Loading Dashboard...";

    loader.style.position="fixed";

    loader.style.inset="0";

    loader.style.display="flex";

    loader.style.alignItems="center";

    loader.style.justifyContent="center";

    loader.style.background="rgba(255,255,255,.8)";

    loader.style.fontSize="24px";

    loader.style.fontWeight="700";

    loader.style.zIndex="9998";

    document.body.appendChild(loader);

}

function hideLoader(){

    const loader=document.getElementById(

        "globalLoader"

    );

    if(loader){

        loader.remove();

    }

}

/* ==========================================================
   UTILITIES
========================================================== */

function formatPercentage(value){

    return `${value}%`;

}

function formatDate(date){

    return new Date(date)

        .toLocaleDateString("en-IN");

}

function byId(id){

    return document.getElementById(id);

}

/* ==========================================================
   PLACEHOLDER FOR DATA LOAD
========================================================== */

function loadDashboard(){

    loadSampleKPIs();

}

/* ==========================================================
   APPLICATION STARTUP
========================================================== */

window.addEventListener("load",()=>{

    showLoader();

    setTimeout(()=>{

        hideLoader();

        loadDashboard();

        showToast(

            "Dashboard Loaded Successfully"

        );

    },800);

});
