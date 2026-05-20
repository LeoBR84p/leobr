(() => {
    'use strict';

    const state = {
        current: 1,
        total: 15,
        animating: false,
        touchStartX: 0,
        touchStartY: 0,
    };

    const dom = {
        slides: document.querySelectorAll('.slide'),
        progressBar: document.getElementById('progress-bar'),
        currentSlide: document.getElementById('current-slide'),
        totalSlides: document.getElementById('total-slides'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnOverview: document.getElementById('btn-overview'),
        overviewPanel: document.getElementById('overview-panel'),
        overviewGrid: document.querySelector('.overview-grid'),
    };

    const TRANSITION_DURATION = 800;

    function init() {
        dom.totalSlides.textContent = state.total;
        buildOverview();
        bindEvents();
        updateUI();
    }

    function buildOverview() {
        const titles = [
            'Departamento de Controle Interno',
            'Estrutura AIC/DECOI',
            'Políticas Corporativas',
            'GECOI — Controle Interno',
            'Frentes Estratégicas — GECOI',
            'GECONF — Conformidade',
            'Frentes Estratégicas — GECONF',
            'GDICE — Dados e Inteligência',
            'Novas Iniciativas — GDICE',
            'UCON — Controle',
            'Frentes Estratégicas — UCON',
            'GEMOD — Risco de Modelo',
            'Formas de Atuação — GEMOD',
            'Norma.AI — Projeto em Destaque',
            'Obrigado',
        ];

        titles.forEach((title, i) => {
            const thumb = document.createElement('div');
            thumb.className = `overview-thumb${i === 0 ? ' active' : ''}`;
            thumb.textContent = title;
            thumb.dataset.slide = i + 1;
            thumb.addEventListener('click', () => {
                goToSlide(i + 1);
                toggleOverview(false);
            });
            dom.overviewGrid.appendChild(thumb);
        });
    }

    function bindEvents() {
        dom.btnPrev.addEventListener('click', prevSlide);
        dom.btnNext.addEventListener('click', nextSlide);
        dom.btnOverview.addEventListener('click', () => toggleOverview());

        document.addEventListener('keydown', handleKeydown);
        document.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.addEventListener('touchend', handleTouchEnd, { passive: true });
        document.addEventListener('wheel', handleWheel, { passive: false });
    }

    function handleKeydown(e) {
        if (!dom.overviewPanel.classList.contains('hidden')) {
            if (e.key === 'Escape') toggleOverview(false);
            return;
        }

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case ' ':
            case 'PageDown':
                e.preventDefault();
                nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                prevSlide();
                break;
            case 'Home':
                e.preventDefault();
                goToSlide(1);
                break;
            case 'End':
                e.preventDefault();
                goToSlide(state.total);
                break;
            case 'Escape':
                toggleOverview();
                break;
            case 'g':
                toggleOverview();
                break;
        }
    }

    function handleTouchStart(e) {
        state.touchStartX = e.changedTouches[0].screenX;
        state.touchStartY = e.changedTouches[0].screenY;
    }

    function handleTouchEnd(e) {
        const deltaX = e.changedTouches[0].screenX - state.touchStartX;
        const deltaY = e.changedTouches[0].screenY - state.touchStartY;

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            if (deltaX < 0) nextSlide();
            else prevSlide();
        }
    }

    let wheelTimeout = null;
    function handleWheel(e) {
        e.preventDefault();
        if (wheelTimeout) return;

        wheelTimeout = setTimeout(() => {
            wheelTimeout = null;
        }, 800);

        if (e.deltaY > 30) nextSlide();
        else if (e.deltaY < -30) prevSlide();
    }

    function nextSlide() {
        if (state.animating || state.current >= state.total) return;
        goToSlide(state.current + 1, 'next');
    }

    function prevSlide() {
        if (state.animating || state.current <= 1) return;
        goToSlide(state.current - 1, 'prev');
    }

    function goToSlide(target, direction) {
        if (target === state.current || state.animating) return;
        if (target < 1 || target > state.total) return;

        state.animating = true;
        const dir = direction || (target > state.current ? 'next' : 'prev');

        const currentSlideEl = dom.slides[state.current - 1];
        const nextSlideEl = dom.slides[target - 1];

        currentSlideEl.classList.remove('active');
        currentSlideEl.classList.add(dir === 'next' ? 'exit-left' : 'exit-right');

        nextSlideEl.classList.remove('exit-left', 'exit-right');
        nextSlideEl.style.transform = dir === 'next'
            ? 'translateX(60px) scale(0.97)'
            : 'translateX(-60px) scale(0.97)';
        nextSlideEl.style.opacity = '0';

        requestAnimationFrame(() => {
            nextSlideEl.classList.add('active');
            nextSlideEl.style.transform = '';
            nextSlideEl.style.opacity = '';
        });

        state.current = target;
        updateUI();
        handleSlideMedia(target);

        setTimeout(() => {
            currentSlideEl.classList.remove('exit-left', 'exit-right');
            state.animating = false;
        }, TRANSITION_DURATION);
    }

    function updateUI() {
        const progress = (state.current / state.total) * 100;
        dom.progressBar.style.width = `${progress}%`;
        dom.currentSlide.textContent = state.current;

        dom.btnPrev.style.opacity = state.current <= 1 ? '0.3' : '1';
        dom.btnPrev.style.pointerEvents = state.current <= 1 ? 'none' : 'auto';
        dom.btnNext.style.opacity = state.current >= state.total ? '0.3' : '1';
        dom.btnNext.style.pointerEvents = state.current >= state.total ? 'none' : 'auto';

        document.querySelectorAll('.overview-thumb').forEach((thumb) => {
            thumb.classList.toggle('active', parseInt(thumb.dataset.slide) === state.current);
        });
    }

    function toggleOverview(forceState) {
        const show = forceState !== undefined ? forceState : dom.overviewPanel.classList.contains('hidden');
        dom.overviewPanel.classList.toggle('hidden', !show);
    }

    function handleSlideMedia(slideNum) {
        document.querySelectorAll('.norma-ai__video').forEach((video) => {
            video.pause();
            video.currentTime = 0;
        });

        if (slideNum === 14) {
            const video = dom.slides[13]?.querySelector('.norma-ai__video');
            if (video) {
                video.currentTime = 0;
                video.play().catch(() => {});
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
