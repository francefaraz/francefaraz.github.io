// Premium Portfolio JS - v2
class PremiumPortfolio {
    constructor() {
        this.init();
    }

    init() {
        this.initLoadingScreen();
        this.init3DRobot();
        this.initNavigation();
        this.initScrollEffects();
        this.initCounters();
        this.initSkillBars();
        this.initProjectCards();
        this.initFormSubmission();
        this.initRevealAnimations();
        this.setupEventListeners();
    }

    initLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            loadingScreen.classList.add('hidden');
            
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                this.animateHeroElements();
            }, 800);
        }, 2000);
    }

    animateHeroElements() {
        const elements = document.querySelectorAll('.title-line, .hero-subtitle, .hero-buttons, .hero-stats');
        elements.forEach((element, index) => {
            setTimeout(() => {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }, index * 200);
        });
    }

    init3DRobot() {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        const container = document.getElementById('hero-canvas');

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0x6366f1, 2, 100);
        pointLight.position.set(10, 10, 10);
        scene.add(pointLight);

        const pointLight2 = new THREE.PointLight(0xec4899, 2, 100);
        pointLight2.position.set(-10, -10, 10);
        scene.add(pointLight2);

        // Create Robot Body
        const robotGroup = new THREE.Group();

        // Robot Head
        const headGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
        const headMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x1e293b,
            shininess: 100
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.5;
        robotGroup.add(head);

        // Robot Eyes
        const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x6366f1 });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.5, 1.8, 0.8);
        rightEye.position.set(0.5, 1.8, 0.8);
        robotGroup.add(leftEye);
        robotGroup.add(rightEye);

        // Robot Body
        const bodyGeometry = new THREE.BoxGeometry(2.5, 3, 1.5);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x334155,
            shininess: 50
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        robotGroup.add(body);

        // Robot Arms
        const armGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
        const armMaterial = new THREE.MeshPhongMaterial({ color: 0x1e293b });
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-1.5, 1, 0);
        rightArm.position.set(1.5, 1, 0);
        robotGroup.add(leftArm);
        robotGroup.add(rightArm);

        // Robot Legs
        const legGeometry = new THREE.BoxGeometry(0.4, 1.5, 0.4);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x0f172a });
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.7, -1.5, 0);
        rightLeg.position.set(0.7, -1.5, 0);
        robotGroup.add(leftLeg);
        robotGroup.add(rightLeg);

        // Robot Screen
        const screenGeometry = new THREE.BoxGeometry(1.8, 1, 0.1);
        const screenMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x0f172a,
            emissive: 0x1e293b,
            emissiveIntensity: 0.3
        });
        const screen = new THREE.Mesh(screenGeometry, screenMaterial);
        screen.position.y = 1.5;
        robotGroup.add(screen);

        scene.add(robotGroup);

        // Particles System
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 1000;
        const posArray = new Float32Array(particlesCount * 3);

        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 20;
        }

        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            color: 0x6366f1,
            transparent: true,
            opacity: 0.6
        });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        // Holographic Lines
        const linesGeometry = new THREE.BufferGeometry();
        const linesCount = 50;
        const linesPosArray = new Float32Array(linesCount * 3);

        for (let i = 0; i < linesCount * 3; i += 3) {
            linesPosArray[i] = (Math.random() - 0.5) * 15;
            linesPosArray[i + 1] = (Math.random() - 0.5) * 10;
            linesPosArray[i + 2] = (Math.random() - 0.5) * 15;
        }

        linesGeometry.setAttribute('position', new THREE.BufferAttribute(linesPosArray, 3));
        const linesMaterial = new THREE.LineBasicMaterial({
            color: 0xec4899,
            transparent: true,
            opacity: 0.3
        });
        const linesMesh = new THREE.LineSegments(linesGeometry, linesMaterial);
        scene.add(linesMesh);

        camera.position.z = 8;
        camera.position.y = 2;

        // Animation variables
        let time = 0;
        let mouseX = 0;
        let mouseY = 0;

        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            mouseX = (event.clientX - window.innerWidth / 2) / 100;
            mouseY = (event.clientY - window.innerHeight / 2) / 100;
        });

        // Touch support
        document.addEventListener('touchmove', (event) => {
            if (event.touches.length > 0) {
                mouseX = (event.touches[0].clientX - window.innerWidth / 2) / 100;
                mouseY = (event.touches[0].clientY - window.innerHeight / 2) / 100;
            }
        });

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            time += 0.01;

            // Robot animation
            robotGroup.rotation.y = mouseX * 0.5;
            robotGroup.rotation.x = mouseY * 0.2;

            // Arms movement
            leftArm.rotation.z = Math.sin(time) * 0.5;
            rightArm.rotation.z = -Math.sin(time) * 0.5;

            // Legs movement
            leftLeg.rotation.x = Math.sin(time * 2) * 0.3;
            rightLeg.rotation.x = -Math.sin(time * 2) * 0.3;

            // Screen glow effect
            const glowIntensity = Math.sin(time * 2) * 0.5 + 0.5;
            screenMaterial.emissiveIntensity = glowIntensity * 0.5;

            // Particles movement
            particlesMesh.rotation.y = time * 0.1;
            particlesMesh.rotation.x = time * 0.05;

            // Lines animation
            linesMesh.rotation.y = -time * 0.2;

            // Camera follow
            camera.position.x += (mouseX * 2 - camera.position.x) * 0.05;
            camera.position.y += (-mouseY * 2 - camera.position.y) * 0.05;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };

        animate();

        // Handle resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    initNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navLinks = document.querySelector('.nav-links');
        const navLinkItems = document.querySelectorAll('.nav-link');

        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.innerHTML = navLinks.classList.contains('active') 
                ? '<i class="bx bx-x"></i>' 
                : '<i class="bx bx-menu"></i>';
        });

        navLinkItems.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.innerHTML = '<i class="bx bx-menu"></i>';
                this.setActiveNavLink(link);
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
                navLinks.classList.remove('active');
                navToggle.innerHTML = '<i class="bx bx-menu"></i>';
            }
        });
    }

    setActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    initScrollEffects() {
        // Navbar scroll effect
        window.addEventListener('scroll', () => {
            const nav = document.querySelector('.nav');
            if (window.scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }

            // Update active nav link based on scroll position
            this.updateActiveNavOnScroll();
        });

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    const offsetTop = target.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    updateActiveNavOnScroll() {
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');

        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    }

    initCounters() {
        const stats = document.querySelectorAll('.stat-number');
        const observerOptions = {
            threshold: 0.5,
            rootMargin: '0px'
        };

        const counterObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const statNumber = entry.target;
                    const target = parseInt(statNumber.getAttribute('data-count'));
                    this.animateCounter(statNumber, 0, target, 2000);
                    counterObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        stats.forEach(stat => {
            counterObserver.observe(stat);
        });
    }

    animateCounter(element, start, end, duration) {
        const startTime = performance.now();
        const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

        const update = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);
            const currentValue = Math.floor(start + (end - start) * easedProgress);
            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(update);
            }
        };

        requestAnimationFrame(update);
    }

    initSkillBars() {
        const skillBars = document.querySelectorAll('.skill-bar');
        const observerOptions = {
            threshold: 0.3,
            rootMargin: '0px'
        };

        const skillObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.width = entry.target.style.width || '100%';
                    skillObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        skillBars.forEach(bar => {
            skillObserver.observe(bar);
        });
    }

    initProjectCards() {
        const projectCards = document.querySelectorAll('.project-card');
        const observerOptions = {
            threshold: 0.2,
            rootMargin: '0px'
        };

        const projectObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 200);
                    projectObserver.unobserve(entry.target);
                }
            });
        }, observerOptions);

        projectCards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(50px)';
            card.style.transition = 'all 0.6s ease';
            projectObserver.observe(card);
        });
    }

    initFormSubmission() {
        const form = document.getElementById('contact-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(form);
            });
        }
    }

    handleFormSubmission(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            console.log('Form submitted:', data);
            this.showNotification('Message sent successfully!', 'success');
            form.reset();
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 2000);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 1rem 2rem;
            background: ${type === 'success' ? 'linear-gradient(135deg, var(--accent), var(--primary))' : 'linear-gradient(135deg, var(--secondary), var(--primary))'};
            color: white;
            border-radius: 10px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            font-weight: 600;
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    initRevealAnimations() {
        const revealElements = document.querySelectorAll('.fade-in, .scale-in');

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px'
        });

        revealElements.forEach(element => {
            revealObserver.observe(element);
        });
    }

    setupEventListeners() {
        // Scroll to top button
        const scrollTopBtn = document.createElement('button');
        scrollTopBtn.innerHTML = '<i class="bx bx-up-arrow-alt"></i>';
        scrollTopBtn.className = 'scroll-top-btn';
        scrollTopBtn.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 1.5rem;
            cursor: pointer;
            opacity: 0;
            transition: all 0.3s ease;
            z-index: 999;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: var(--shadow-lg);
        `;
        document.body.appendChild(scrollTopBtn);

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        // Show/hide scroll top button
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollTopBtn.style.opacity = '1';
                scrollTopBtn.style.transform = 'translateY(0)';
            } else {
                scrollTopBtn.style.opacity = '0';
                scrollTopBtn.style.transform = 'translateY(20px)';
            }
        });

        // Smooth hover effects for interactive elements
        this.initInteractiveEffects();
    }

    initInteractiveEffects() {
        // Magnetic effect for buttons
        const magneticElements = document.querySelectorAll('.btn, .nav-link, .skill-item, .project-card, .highlight-item');

        magneticElements.forEach(element => {
            element.addEventListener('mousemove', (e) => {
                const rect = element.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                element.style.transform = `translate(${x * 0.02}px, ${y * 0.02}px)`;
            });

            element.addEventListener('mouseleave', () => {
                element.style.transform = 'translate(0, 0)';
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PremiumPortfolio();
});

// Performance optimization
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Recalculate anything that depends on window size
    }, 250);
});

// Preload critical resources
const preloadResources = () => {
    const images = [
        '../assets/img/profile.gif',
        '../assets/img/webeqt.png',
        '../assets/img/lightning_loan.png',
        '../assets/img/inspire_me_now.jpg'
    ];

    images.forEach(src => {
        const img = new Image();
        img.src = src;
    });
};

preloadResources();