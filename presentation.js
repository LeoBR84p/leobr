(() => {
    'use strict';

    const state = {
        current: 1,
        total: 14,
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
    const FEATURED_VIDEO_VOLUME = 0.7;

    function init() {
        dom.totalSlides.textContent = state.total;
        buildOverview();
        buildOrgMap();
        bindEvents();
        bindNormaSoundButton();
        updateUI();
    }

    /* ── Organograma interativo ───────────────────────────────── */
    const ORG_ROLES = {
        investidor: { label: 'Investidor', color: '#2e8b86' },
        credor: { label: 'Credor', color: '#dfa733' },
        servicos: { label: 'Prestação de Serviços', color: '#6c3fa5' },
        devedor: { label: 'Devedor', color: '#e23a2e' },
        controle: { label: 'Camadas de Controle*', color: '#2f3640' },
    };

    const ORG_DIRS = [
        { id: 'DIR 1', name: 'Pessoas, TI e Operações', head: 'Helena Tenório', units: [
            { sigla: 'ARH', nome: 'Recursos Humanos', role: null },
            { sigla: 'ATI', nome: 'Tecnologia da Informação', role: null },
            { sigla: 'ASN', nome: 'Suporte ao Negócio', role: 'controle' },
        ]},
        { id: 'DIR 2', name: 'Socioambiental', head: 'Tereza Campello', units: [
            { sigla: 'AS', nome: 'Desenvolvimento Social e Gestão Pública', role: 'credor' },
            { sigla: 'AMA', nome: 'Meio Ambiente', role: 'credor' },
        ]},
        { id: 'DIR 3', name: 'Financeira e de Mercado de Capitais', head: 'Alexandre Abreu', units: [
            { sigla: 'AF', nome: 'Financeira', role: 'investidor' },
            { sigla: 'ACO', nome: 'Controladoria', role: 'controle' },
            { sigla: 'AMC', nome: 'Mercado de Capitais, Investimentos e Participações', role: 'investidor' },
        ]},
        { id: 'DIR 4', name: 'Crédito Digital para MPMEs e Gestão do Fundo Rio Doce', head: 'Maria Fernanda', units: [
            { sigla: 'ADIG', nome: 'Operações e Canais Digitais', role: 'credor' },
            { sigla: 'Fundo Rio Doce', nome: 'Enfrentamento de Eventos Extremos e Gestão do Fundo Rio Doce', role: 'credor' },
        ]},
        { id: 'DIR 5', name: 'Infraestrutura e Mudança Climática', head: 'Luciana Costa', units: [
            { sigla: 'AINFRA', nome: 'Infraestrutura', role: 'credor' },
            { sigla: 'AEC', nome: 'Transição Energética e Clima', role: 'credor' },
        ]},
        { id: 'DIR 6', name: 'Jurídica', head: 'Walter Baère', units: [
            { sigla: 'AJI', nome: 'Jurídica Institucional', role: 'controle' },
            { sigla: 'AJN', nome: 'Jurídica de Negócios', role: null },
        ]},
        { id: 'DIR 7', name: 'Desenvolvimento Produtivo, Inovação e Comércio Exterior', head: 'José Luis Gordon', units: [
            { sigla: 'AI', nome: 'Desenvolvimento Produtivo e Inovação', role: 'credor' },
            { sigla: 'AEX', nome: 'Comércio Exterior', role: 'credor' },
        ]},
        { id: 'DIR 8', name: 'Planejamento e Relações Institucionais', head: 'Nelson Barbosa', units: [
            { sigla: 'ASC', nome: 'Soluções para Cidades', role: 'servicos' },
            { sigla: 'ASI', nome: 'Soluções de Infraestrutura', role: 'servicos' },
            { sigla: 'AP', nome: 'Planejamento e Pesquisa Econômica', role: null },
            { sigla: 'AINT', nome: 'Internacional e de Captação de Recursos', role: 'devedor' },
        ]},
        { id: 'DIR 9', name: 'Risco e Compliance', head: 'Jean Uema', units: [
            { sigla: 'AGR', nome: 'Gestão de Riscos', role: 'controle' },
            { sigla: 'AIC', nome: 'Integridade e Compliance', role: 'controle' },
        ]},
    ];

    const ORG_TOP = ['Conselho de Administração', 'Auditoria Interna', 'Ouvidoria', 'Presidência', 'Gabinete da Presidência (GP)', 'ARMC', 'SET'];

    function buildOrgMap() {
        const root = document.getElementById('orgmap-root');
        if (!root) return;

        const legend = document.createElement('div');
        legend.className = 'orgmap-legend';
        Object.entries(ORG_ROLES).forEach(([key, meta]) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'orgmap-legend__item';
            btn.dataset.role = key;
            btn.innerHTML = `<span class="orgmap-swatch" style="background:${meta.color}"></span>${meta.label}`;
            btn.addEventListener('click', () => setOrgFilter(root, key));
            legend.appendChild(btn);
        });
        const conflictBtn = document.createElement('button');
        conflictBtn.type = 'button';
        conflictBtn.className = 'orgmap-legend__item orgmap-legend__item--conflict';
        conflictBtn.innerHTML = '&#9888; Potenciais conflitos';
        conflictBtn.addEventListener('click', () => {
            root.classList.toggle('show-conflicts');
            conflictBtn.classList.toggle('active', root.classList.contains('show-conflicts'));
        });
        legend.appendChild(conflictBtn);
        root.appendChild(legend);

        const top = document.createElement('div');
        top.className = 'orgmap-top';
        ORG_TOP.forEach((name) => {
            const pill = document.createElement('span');
            pill.className = `orgmap-top__pill${name === 'Presidência' ? ' orgmap-top__pill--main' : ''}`;
            pill.textContent = name;
            top.appendChild(pill);
        });
        root.appendChild(top);

        const grid = document.createElement('div');
        grid.className = 'orgmap-grid';
        ORG_DIRS.forEach((dir) => {
            const roles = [...new Set(dir.units.map((u) => u.role).filter(Boolean))];
            const hasConflict = roles.length > 1;

            const card = document.createElement('div');
            card.className = 'orgmap-dir';
            if (hasConflict) {
                card.dataset.conflict = 'true';
                card.title = `Atenção: ${roles.map((r) => ORG_ROLES[r].label.replace('*', '')).join(' + ')} na mesma diretoria — potencial conflito`;
            }

            const head = document.createElement('div');
            head.className = 'orgmap-dir__head';
            head.innerHTML = `<strong>${dir.id}</strong><span>${dir.name}</span><em>${dir.head}</em>`;
            card.appendChild(head);

            dir.units.forEach((unit) => {
                const chip = document.createElement('div');
                chip.className = 'orgmap-unit';
                if (unit.role) {
                    chip.dataset.role = unit.role;
                    chip.style.setProperty('--unit-color', ORG_ROLES[unit.role].color);
                    chip.title = `${unit.nome} — papel: ${ORG_ROLES[unit.role].label.replace('*', '')}`;
                } else {
                    chip.title = unit.nome;
                }
                chip.innerHTML = `<strong>${unit.sigla}</strong><span>${unit.nome}</span>`;
                card.appendChild(chip);
            });

            if (hasConflict) {
                const alert = document.createElement('div');
                alert.className = 'orgmap-dir__alert';
                alert.innerHTML = `&#9888; ${roles.map((r) => ORG_ROLES[r].label.replace('*', '')).join(' + ')}`;
                card.appendChild(alert);
            }

            grid.appendChild(card);
        });
        root.appendChild(grid);
    }

    function setOrgFilter(root, role) {
        const current = root.dataset.filter;
        const next = current === role ? '' : role;
        if (next) root.dataset.filter = next;
        else delete root.dataset.filter;

        root.querySelectorAll('.orgmap-legend__item[data-role]').forEach((btn) => {
            btn.classList.toggle('active', btn.dataset.role === next);
        });
        root.querySelectorAll('.orgmap-unit').forEach((chip) => {
            chip.classList.remove('match', 'dim');
            if (next) {
                chip.classList.add(chip.dataset.role === next ? 'match' : 'dim');
            }
        });
    }

    function buildOverview() {
        const titles = [
            'Departamento de Controle Interno',
            'Estrutura AIC/DECOI',
            'Políticas e Procedimentos',
            'GECOI — Gerência de Controle Interno',
            'Torre de Controle — Projeto em Destaque',
            'GECONF — Gerência de Conformidade',
            'GEDICE — Gestão de Dados e Inteligência',
            'UCON — Unidade de Controle',
            'Above the Wall no BNDES',
            'Organograma — Papéis e Conflitos',
            'GEMOD — Gestão de Risco de Modelo',
            'Norma.AI — Projeto em Destaque',
            'CNPJ Alfanumérico — Projeto em Destaque',
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
            video.muted = true;
            video.volume = 0;
        });
        document.querySelectorAll('.norma-ai__sound-btn').forEach((btn) => {
            btn.classList.add('hidden');
        });

        const slide = dom.slides[slideNum - 1];
        const video = slide?.querySelector('.norma-ai__video');
        const soundBtn = slide?.querySelector('.norma-ai__sound-btn');
        if (!video) return;

        video.loop = false;
        video.currentTime = 0;

        if (slide.classList.contains('slide--cnpj')) {
            video.muted = true;
            video.volume = 0;
            video.play().catch(() => {});
            return;
        }

        video.muted = false;
        video.volume = FEATURED_VIDEO_VOLUME;

        video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
            soundBtn?.classList.remove('hidden');
        });
    }

    function bindNormaSoundButton() {
        document.querySelectorAll('.norma-ai__sound-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const video = btn.closest('.norma-ai__video-wrap')?.querySelector('.norma-ai__video');
                if (!video) return;
                video.muted = false;
                video.volume = FEATURED_VIDEO_VOLUME;
                video.play().then(() => btn.classList.add('hidden')).catch(() => {});
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
