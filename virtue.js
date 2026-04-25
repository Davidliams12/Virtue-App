// --- Firebase Config & Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyD5DaRQRagBw4SygXkVykC_l_CN3GAYt_k",
    authDomain: "virtue-mall.firebaseapp.com",
    projectId: "virtue-mall",
    storageBucket: "virtue-mall.firebasestorage.app",
    messagingSenderId: "1065970390704",
    appId: "1:1065970390704:web:cde54a37805923292c4d75",
    measurementId: "G-2BGXDT47MD"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- Global Variables ---
let allProducts = [];
let toastTimer;
let currentImgIndex = 0;
let currentProductImages = [];

// --- NEW: Hero Slider Variables ---
const heroImages = [
    "001.jpg", 
    "002.jpg", 
    "003.jpg"
]; 
let heroIndex = 0;

// --- Firebase Data Loading ---

function loadCloudProducts() {
    db.collection("products").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        allProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderShop();
        updateBadge(); 
    });
}

// --- NEW: Notification Logic ---
function listenForNotifications() {
    const profile = JSON.parse(localStorage.getItem("virtue_user_data")) || {};
    const email = (profile.email || "").toLowerCase().trim();
    
    if(!email) return;

    db.collection("notifications")
      .where("userEmail", "==", email)
      .where("read", "==", false) 
      .onSnapshot(snapshot => {
          const countDisplay = document.getElementById('noti-count');
          if(!countDisplay) return;
          const count = snapshot.size;
          if(count > 0) {
              countDisplay.innerText = count;
              countDisplay.style.display = "flex";
          } else {
              countDisplay.style.display = "none";
          }
      });
}

function listenToOrders() {
    const userId = localStorage.getItem('virtue_user_id'); 
    if(!userId) return;

    db.collection("orders").where("userId", "==", userId).onSnapshot((snapshot) => {
        const count = snapshot.size;
        const badge = document.getElementById('booked-notification');
        if(badge) {
            if(count > 0) {
                badge.innerText = count;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// --- NEW: Hero Background Animation ---
function changeHeroBackground() {
    const hero = document.getElementById('hero-slider');
    if(!hero || heroImages.length === 0) return;
    
    hero.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${heroImages[heroIndex]}')`;
    heroIndex = (heroIndex + 1) % heroImages.length;
}

// --- UI Rendering ---

function renderShop() {
    const boxes = { 
        "phones & gadgets": document.getElementById('phones-box'), 
        "electronics": document.getElementById('electronics-box'), 
        "kitchen & home": document.getElementById('kitchen-box') 
    };
    
    Object.values(boxes).forEach(b => { if(b) b.innerHTML = ''; });

    allProducts.forEach((p) => {
        const categoryKey = p.category ? p.category.toLowerCase() : 'electronics';
        const box = boxes[categoryKey] || (categoryKey.includes('kitchen') ? boxes['kitchen & home'] : boxes['electronics']);
        
        if(!box) return;

        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => viewProduct(p.id);
        card.innerHTML = `
            <img src="${p.images[0]}" alt="${p.name}">
            <span class="card-name">${p.name}</span>
            <span class="card-price">₦${Number(p.price).toLocaleString()}</span>
            <button class="add-btn" onclick="event.stopPropagation(); addToCart('${p.id}')">ADD TO BAG</button>
        `;
        box.appendChild(card);
    });
}

// --- Product Modal & Slider ---

function viewProduct(id) {
    const p = allProducts.find(x => x.id == id);
    const modal = document.getElementById('product-view-modal');
    const content = document.getElementById('modal-content');
    if(!p || !modal) return;

    currentProductImages = p.images || [p.image];
    currentImgIndex = 0;

    content.innerHTML = `
        <div class="slider-container">
            <button class="slider-btn prev-btn" id="modal-prev"><i class="fas fa-chevron-left"></i></button>
            <img src="${currentProductImages[0]}" class="modal-image" id="slider-img">
            <button class="slider-btn next-btn" id="modal-next"><i class="fas fa-chevron-right"></i></button>
            <div class="dots-box" id="dots-box"></div>
        </div>
        <div class="modal-title" style="font-weight:700; font-size:1.1rem; margin-top:10px;">${p.name}</div>
        <div class="modal-price" style="color:var(--accent-orange); font-weight:700; font-size:1.2rem; margin:5px 0;">₦${Number(p.price).toLocaleString()}</div>
        <div class="modal-desc" style="font-size:0.85rem; color:#666;">${p.description || 'Premium quality exclusively at Virtue Mall.'}</div>
    `;
    
    const prevBtn = document.getElementById('modal-prev'), nextBtn = document.getElementById('modal-next');
    if (currentProductImages.length > 1) {
        prevBtn.classList.add('show'); nextBtn.classList.add('show');
        prevBtn.onclick = () => moveSlider(-1); nextBtn.onclick = () => moveSlider(1);
    }
    updateDots();
    document.getElementById('modal-add-btn').onclick = () => { addToCart(p.id); closeProductView(); };
    modal.classList.add('open');
}

function moveSlider(dir) {
    currentImgIndex = (currentImgIndex + dir + currentProductImages.length) % currentProductImages.length;
    const imgElement = document.getElementById('slider-img');
    if(imgElement) imgElement.src = currentProductImages[currentImgIndex];
    updateDots();
}

function updateDots() {
    const dotsBox = document.getElementById('dots-box');
    if(dotsBox) dotsBox.innerHTML = currentProductImages.map((_, i) => `<div class="dot ${i === currentImgIndex ? 'active' : ''}"></div>`).join('');
}

function closeProductView() { document.getElementById('product-view-modal').classList.remove('open'); }

// --- Search & Filtering ---

function handleSearch() {
    const query = document.getElementById('main-search').value.toLowerCase().trim();
    const normalView = document.getElementById('normal-view'), searchView = document.getElementById('search-view'), searchBox = document.getElementById('search-box');
    
    if (query === "") { 
        normalView.style.display = 'block'; 
        searchView.style.display = 'none'; 
        return; 
    }

    const results = allProducts.filter(p => p.name.toLowerCase().includes(query));
    normalView.style.display = 'none'; 
    searchView.style.display = 'block';
    document.getElementById('search-title').innerText = `Results for "${query}" (${results.length})`;
    
    searchBox.innerHTML = results.length ? '' : '<p style="padding:40px; text-align:center; color:#999; width:100%;">No items found.</p>';
    results.forEach(p => {
        const card = document.createElement('div'); card.className = 'card';
        card.onclick = () => viewProduct(p.id);
        card.innerHTML = `<img src="${p.images[0]}"><span class="card-name">${p.name}</span><span class="card-price">₦${Number(p.price).toLocaleString()}</span><button class="add-btn" onclick="event.stopPropagation(); addToCart('${p.id}')">ADD TO BAG</button>`;
        searchBox.appendChild(card);
    });
}

function filterCategory(cat, btn) {
    document.querySelectorAll('.product-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if(cat === 'All') {
        document.querySelectorAll('.section-wrap').forEach(s => s.style.display = 'block');
    } else {
        document.querySelectorAll('.section-wrap').forEach(s => {
            const title = s.querySelector('h3').innerText.toLowerCase();
            s.style.display = title.includes(cat.toLowerCase()) ? 'block' : 'none';
        });
    }
}

// --- Cart Logic (Persistent) ---

function addToCart(id) {
    const product = allProducts.find(x => x.id == id);
    if(!product) return;

    let cart = JSON.parse(localStorage.getItem("virtue_cart")) || [];
    const existing = cart.find(x => x.id == id);
    
    if(existing) {
        existing.qty++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images,
            qty: 1
        });
    }
    
    localStorage.setItem("virtue_cart", JSON.stringify(cart));
    updateBadge(); 
    showToast(`"${product.name}" added to bag`);
}

function updateBadge() {
    const cart = JSON.parse(localStorage.getItem("virtue_cart")) || [];
    const badge = document.getElementById('cart-badge');
    if(badge) {
        const totalItems = cart.reduce((s, i) => s + i.qty, 0);
        badge.innerText = totalItems;
    }
}

function showToast(msg) { 
    const t = document.getElementById('toast'); 
    if(!t) return;
    clearTimeout(toastTimer); 
    t.innerText = msg; 
    t.classList.add('show'); 
    toastTimer = setTimeout(() => t.classList.remove('show'), 2500); 
}

// --- Theme & Initialization ---

function syncTheme() {
    const theme = localStorage.getItem('virtue_theme');
    if(theme === 'light') {
        document.body.classList.add('light-mode');
    } else {
        document.body.classList.remove('light-mode');
    }
}

window.onload = () => {
    loadCloudProducts();
    listenToOrders();
    listenForNotifications(); // Added Notification Dot Logic
    syncTheme();
    
    // Start Hero Slider
    if(heroImages.length > 0) {
        changeHeroBackground();
        setInterval(changeHeroBackground, 5000);
    }
    
    const savedPic = localStorage.getItem('virtue_profile_pic');
    if(savedPic && document.getElementById('profile-img')) {
        document.getElementById('profile-img').src = savedPic;
    }
};
