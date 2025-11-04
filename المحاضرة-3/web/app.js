let slides = [];
let currentIndex = 0;

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
}

async function loadSlides() {
    try {
        const res = await fetch('slides.json');
        if (!res.ok) {
            throw new Error(`Failed to load slides.json: ${res.status}`);
        }
        slides = await res.json();
        if (!slides || slides.length === 0) {
            console.error('No slides found in slides.json');
            document.getElementById('slideText').innerHTML = '<p style="color: red;">لا توجد شرائح في الملف</p>';
            return;
        }
        slides.sort((a, b) => a.id - b.id);
        buildMenu();
        const hashId = parseInt((location.hash || '').replace('#slide-', ''), 10);
        const startIndex = Number.isFinite(hashId) ? slides.findIndex(s => s.id === hashId) : 0;
        currentIndex = startIndex >= 0 ? startIndex : 0;
        renderCurrent();
    } catch (error) {
        console.error('Error loading slides:', error);
        document.getElementById('slideText').innerHTML = `<p style="color: red;">خطأ في تحميل الشرائح: ${error.message}</p>`;
    }
}

function buildMenu() {
    const menu = document.getElementById('slides-menu');
    menu.innerHTML = '';
    slides.forEach((s, idx) => {
        const a = document.createElement('a');
        a.href = `#slide-${s.id}`;
        a.textContent = s.title;
        a.addEventListener('click', (e) => {
            e.preventDefault();
            currentIndex = idx;
            renderCurrent();
            if (window.innerWidth <= 768) closeSidebar();
        });
        menu.appendChild(a);
    });
    updateActiveMenu();
}

function updateActiveMenu() {
    const menu = document.getElementById('slides-menu');
    [...menu.querySelectorAll('a')].forEach((el, i) => {
        el.classList.toggle('active', i === currentIndex);
    });
}

function setStatus() {
    const status = document.getElementById('statusText');
    status.textContent = `${currentIndex + 1} / ${slides.length}`;
}

function formatText(text) {
    if (!text) return '';
    text = text.replace(/\\n/g, '\n');
    
    let html = '';
    
    // التحقق من وجود أزواج نص/شرح
    if (!text.includes('النص:') && !text.includes('الشرح:')) {
        // عرض النص كما هو
        let lines = text.split('\n').map(line => line.trim()).filter(line => line);
        for (let line of lines) {
            if (!line.startsWith('شرح الشريحة')) {
                html += `<div class="explanation-block"><div class="explanation-content">${line}</div></div>`;
                html += '<div class="separator"></div>';
            }
        }
        return html || '<p>لا يوجد محتوى</p>';
    }

    // تقسيم النص باستخدام regex
    let parts = text.split(/(النص:|الشرح:)/).filter(part => part.trim());
    
    let currentText = '';
    let currentExplanation = '';
    
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i].trim();
        
        if (part === 'النص:') {
            // إغلاق الشرح السابق إن وجد
            if (currentExplanation) {
                html += `<div class="explanation-block"><div class="explanation-label">الشرح:</div><div class="explanation-content">${currentExplanation}</div></div>`;
                html += '<div class="separator"></div>';
                currentExplanation = '';
            }
            // إغلاق النص السابق إن وجد
            if (currentText) {
                html += `<div class="text-block"><div class="text-label">النص:</div><div class="text-content">${currentText}</div></div>`;
                currentText = '';
            }
            // قراءة النص التالي
            if (i + 1 < parts.length && parts[i + 1] !== 'الشرح:') {
                currentText = parts[i + 1].trim();
                i++; // تخطي الجزء التالي
            }
        } else if (part === 'الشرح:') {
            // إغلاق النص الحالي إن وجد
            if (currentText) {
                html += `<div class="text-block"><div class="text-label">النص:</div><div class="text-content">${currentText}</div></div>`;
                currentText = '';
            }
            // قراءة الشرح التالي
            if (i + 1 < parts.length && parts[i + 1] !== 'النص:') {
                currentExplanation = parts[i + 1].trim();
                i++; // تخطي الجزء التالي
            }
        } else if (!part.startsWith('شرح الشريحة') && i === 0) {
            // عنوان الشريحة في البداية - تجاهله
        }
    }
    
    // إغلاق العناصر المتبقية
    if (currentText) {
        html += `<div class="text-block"><div class="text-label">النص:</div><div class="text-content">${currentText}</div></div>`;
    }
    if (currentExplanation) {
        html += `<div class="explanation-block"><div class="explanation-label">الشرح:</div><div class="explanation-content">${currentExplanation}</div></div>`;
        html += '<div class="separator"></div>';
    }



    return html || '<p>لا يوجد محتوى</p>';
}

function escapeHtml(text) {
    // لا نستخدم escapeHtml للمعادلات الرياضية - نتركها كما هي
    // لكن نستخدمها للنص العادي فقط
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function renderCurrent() {
    const slide = slides[currentIndex];
    if (!slide) return;
    location.hash = `slide-${slide.id}`;
    document.getElementById('slideTitle').textContent = slide.title;
    const img = document.getElementById('slideImage');
    img.src = slide.image;
    img.alt = `صورة الشريحة ${slide.id}`;
    img.onerror = function () {
        this.style.display = 'none';
        console.error('Failed to load image:', slide.image);
    };
    img.onload = function () {
        this.style.display = 'block';
    };
    const textEl = document.getElementById('slideText');
    let textContent = slide.text || '';
    if (!textContent && slide.textPath) {
        try {
            const res = await fetch(slide.textPath);
            if (res.ok) {
                textContent = await res.text();
            } else {
                console.error('Failed to load text file:', slide.textPath);
            }
        } catch (e) {
            console.error('Error fetching textPath:', e);
        }
    }
    textEl.innerHTML = formatText(textContent || '');
    setStatus();
    updateActiveMenu();
    document.getElementById('prevBtn').disabled = currentIndex === 0;
    document.getElementById('nextBtn').disabled = currentIndex === slides.length - 1;

    // إعادة معالجة MathJax بعد تحديث المحتوى
    if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([textEl]).catch(function (err) {
            console.error('MathJax error:', err);
        });
    }
}

function next() {
    if (currentIndex < slides.length - 1) {
        currentIndex += 1;
        renderCurrent();
    }
}

function prev() {
    if (currentIndex > 0) {
        currentIndex -= 1;
        renderCurrent();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('prevBtn').addEventListener('click', prev);
    document.getElementById('nextBtn').addEventListener('click', next);
    loadSlides();
});

window.addEventListener('resize', function () {
    if (window.innerWidth > 768) closeSidebar();
});


