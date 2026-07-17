/* ==========================================================
   Hamleys Mystery Audit Intelligence
   Global Application Controller
   Version 1.0

   Handles only: business toggle, default date range,
   toast notifications, loading overlay, small UI utilities.
   Page navigation lives in navigation.js.
   KPI / chart rendering lives in dashboard.js.
   ========================================================== */

"use strict";

const App = {
    business: "retail"
};

document.addEventListener("DOMContentLoaded", () => {
    initialiseBusinessToggle();
    initialiseDates();
    animateCards();
    console.log("Hamleys Mystery Audit Intelligence Loaded");
});

/* ==========================================================
   RETAIL / PLAY TOGGLE
   ========================================================== */

function initialiseBusinessToggle(){
    const retail = document.getElementById("retailToggle");
    const play = document.getElementById("playToggle");
    if(!retail || !play) return;

    retail.addEventListener("click", () => {
        App.business = "retail";
        retail.classList.add("active");
        play.classList.remove("active");
        refreshBusiness();
    });

    play.addEventListener("click", () => {
        App.business = "play";
        play.classList.add("active");
        retail.classList.remove("active");
        refreshBusiness();
    });
}

function refreshBusiness(){
    document.body.setAttribute("data-business", App.business);
    if(typeof updateSectionOptions === "function") updateSectionOptions();
}

/* ==========================================================
   DEFAULT DATE RANGE
   ========================================================== */

function initialiseDates(){
    const from = document.getElementById("fromDate");
    const to = document.getElementById("toDate");
    if(!from || !to) return;
    const today = new Date();
    const first = new Date(today.getFullYear(), 0, 1);
    from.valueAsDate = first;
    to.valueAsDate = today;
}

/* ==========================================================
   CARD ANIMATIONS
   ========================================================== */

function animateCards(){
    const cards = document.querySelectorAll(".kpi-card,.summary-card,.chart-card,.performance-card,.profile-card");
    cards.forEach((card, index) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        setTimeout(() => {
            card.style.transition = "all .45s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0px)";
        }, index * 40);
    });
}

/* ==========================================================
   TOAST NOTIFICATION
   ========================================================== */

function showToast(message, type = "success"){
    let toast = document.getElementById("toast");
    if(!toast){
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "app-toast";
        document.body.appendChild(toast);
    }
    toast.classList.remove("toast-success", "toast-error", "toast-warning");
    toast.classList.add(type === "error" ? "toast-error" : type === "warning" ? "toast-warning" : "toast-success");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* ==========================================================
   LOADING OVERLAY
   ========================================================== */

function showLoader(message = "Loading..."){
    let loader = document.getElementById("globalLoader");
    if(!loader){
        loader = document.createElement("div");
        loader.id = "globalLoader";
        loader.className = "global-loader";
        document.body.appendChild(loader);
    }
    loader.textContent = message;
    loader.style.display = "flex";
}

function hideLoader(){
    const loader = document.getElementById("globalLoader");
    if(loader) loader.style.display = "none";
}

/* ==========================================================
   UTILITIES
   ========================================================== */

function formatPercentage(value){
    return `${value}%`;
}

function formatDate(date){
    return new Date(date).toLocaleDateString("en-IN");
}

function byId(id){
    return document.getElementById(id);
}

window.AppAPI = { showToast, showLoader, hideLoader, formatPercentage, formatDate };
