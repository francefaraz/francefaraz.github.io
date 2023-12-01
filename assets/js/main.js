/*===== MENU SHOW =====*/
const showMenu = (toggleId, navId) => {
  const toggle = document.getElementById(toggleId),
    nav = document.getElementById(navId);

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      nav.classList.toggle("show");
    });
  }
};
showMenu("nav-toggle", "nav-menu");

/*===== ACTIVE AND REMOVE MENU =====*/
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");

window.addEventListener("scroll", () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (scrollY >= sectionTop - 390) {
      current = section.getAttribute('id');
    }
  })

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.classList.contains(current)) {
      link.classList.add('active');
    }
  })
})

// function linkAction() {
//   /*Active link*/
//   navLinks.forEach((n) => n.classList.remove("active"));
//   this.classList.add("active");

//   /*Remove menu mobile*/
const navMenu = document.getElementById("nav-menu");
//   navMenu.classList.remove("show");
// }
navLinks.forEach((n) => n.addEventListener("click", () => { navMenu.classList.remove("show") }));

/*===== COPY Email =====*/
const copy = document.getElementById("copy");
copy.addEventListener("click", () => {
  navigator.clipboard.writeText("kasulaarunteja@gmail.com");
  copy.innerHTML = "copied";
  setTimeout(() => {
    copy.innerHTML = null;
  }, 1000);
});

/*===== SCROLL REVEAL ANIMATION =====*/
const sr = ScrollReveal({
  origin: "top",
  distance: "80px",
  duration: 2000,
  reset: true,
});

/*SCROLL HOME*/
sr.reveal(".home-title", {});
sr.reveal(".button", { delay: 200 });
sr.reveal(".home-img", { delay: 400 });
sr.reveal(".home-social-icon", { interval: 200 });

/*SCROLL ABOUT*/
sr.reveal(".about-img", {});
sr.reveal(".about-subtitle", { delay: 400 });
sr.reveal(".about-text", { delay: 400 });

/*SCROLL SKILLS*/
sr.reveal(".skills-subtitle", {});
sr.reveal(".skills-text", {});
sr.reveal(".skills-data", { interval: 100 });
// sr.reveal(".skills-img", { delay: 600 });

/*SCROLL projects*/
sr.reveal(".project-img", { interval: 200 });

/*SCROLL CONTACT*/
  // sr.reveal(".contact-input", { interval: 200 });

  function myFunction(){
    var element = document.body;
    element.classList.toggle("dark-mode")
  }


  // var messageArr = ["MERN Developer", "Frontend Developer", "Backend Developer"];
  // var textPosition = 0;
  // var speed = 200;

  // typewriter = () => {
  //   for(let i = 0; i < messageArr.length; i++) {
  //   document.querySelector("#jobTitle").innerHTML = messageArr[i].substring(0, textPosition)  ;
  //   if(textPosition ++  != messageArr[i].length)
  //       setTimeout(typewriter, speed)
  //   }
  // }


  // window.addEventListener("load" , typewriter);
// Text for typewriter effect
const jobTitles = ['Sr. Programmer', 'Web Developer', 'Android Developer', 'Gamer', 'Youtuber'];
let index = 0;
let letterIndex = 0;
let text = '';
let isDeleting = false;

function type() {
  const jobTitleElement = document.getElementById('jobTitle');
  const currentText = jobTitles[index];

  if (isDeleting) {
    text = currentText.substring(0, letterIndex - 1);
    jobTitleElement.textContent = text;
    letterIndex--;

    if (text === '') {
      isDeleting = false;
      index = (index + 1) % jobTitles.length;
      setTimeout(type, 500); // Delay after clearing text
    } else {
      setTimeout(type, 50); // Speed of deleting text
    }
  } else {
    text = currentText.substring(0, letterIndex + 1);
    jobTitleElement.textContent = text;
    letterIndex++;

    if (text === currentText) {
      isDeleting = true;
      setTimeout(type, 1000); // Delay after displaying full text
    } else {
      setTimeout(type, 150); // Speed of typing text
    }
  }
}

document.addEventListener('DOMContentLoaded', type);