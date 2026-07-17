/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Navigation Controller
========================================================== */

"use strict";

const Navigation={

    currentPage:"overview"

};

document.addEventListener(

    "DOMContentLoaded",

    initialiseNavigation

);

function initialiseNavigation(){

    detectCurrentPage();

    activateSidebar();

    bindNavigation();

}

/* ==========================================================
   DETECT PAGE
========================================================== */

function detectCurrentPage(){

    const page=

        window.location.pathname

        .split("/")

        .pop()

        .toLowerCase();

    switch(page){

        case "rm.html":

            Navigation.currentPage="rm";

            break;

        case "rom.html":

            Navigation.currentPage="rom";

            break;

        case "sd.html":

            Navigation.currentPage="sd";

            break;

        case "store.html":

            Navigation.currentPage="store";

            break;

        case "admin.html":

            Navigation.currentPage="admin";

            break;

        case "cases.html":

            Navigation.currentPage="cases";

            break;

        default:

            Navigation.currentPage="overview";

    }

}/* ==========================================================
   SIDEBAR
========================================================== */

function activateSidebar(){

    const mapping={

        overview:"navOverview",

        rm:"navRM",

        rom:"navROM",

        sd:"navSD",

        store:"navStore",

        admin:"navAdmin",

        cases:"navCases"

    };

    document

        .querySelectorAll(

            ".nav-item,.nav-link"

        )

        .forEach(item=>{

            item.classList.remove("active");

        });

    const active=

        document.getElementById(

            mapping[Navigation.currentPage]

        );

    if(active){

        active.classList.add("active");

    }

}

/* ==========================================================
   NAVIGATION
========================================================== */

function bindNavigation(){

    bind(

        "navOverview",

        "index.html"

    );

    bind(

        "navRM",

        "rm.html"

    );

    bind(

        "navROM",

        "rom.html"

    );

    bind(

        "navSD",

        "sd.html"

    );

    bind(

        "navStore",

        "store.html"

    );

    bind(

        "navAdmin",

        "admin.html"

    );

    bind(

        "navCases",

        "cases.html"

    );

}/* ==========================================================
   BIND SINGLE LINK
========================================================== */

function bind(

    id,

    page

){

    const element=

        document.getElementById(id);

    if(!element) return;

    element.addEventListener(

        "click",

        function(e){

            e.preventDefault();

            window.location.href=page;

        }

    );

}

/* ==========================================================
   PAGE TITLE
========================================================== */

function setPageTitle(title){

    document.title=

        "Hamleys Mystery Audit Intelligence | "+title;

}/* ==========================================================
   PUBLIC API
========================================================== */

window.NavigationAPI={

    currentPage:function(){

        return Navigation.currentPage;

    },

    go:function(page){

        window.location.href=page;

    }

};

/* ==========================================================
   STARTUP
========================================================== */

console.log(

    "Navigation Controller Loaded"

);
