document.addEventListener('DOMContentLoaded', () => {

    // Modal inicial
    // Se muestra solo si el usuario no ha marcado "No mostrar de nuevo"
    const modalEl = document.getElementById('modalBienvenida');
    if (modalEl && !localStorage.getItem('malla_modal_visto')) {
        new bootstrap.Modal(modalEl).show();
    }
    const btnEntendido = document.getElementById('btn-entendido');
    const chkNoMostrar = document.getElementById('chk-no-mostrar');
    if (btnEntendido && chkNoMostrar) {
        btnEntendido.addEventListener('click', () => {
            if (chkNoMostrar.checked) {
                localStorage.setItem('malla_modal_visto', 'true');
            }
        });
    }

    // Referencias al DOM
    const mallaContainer       = document.getElementById('malla-container');
    const mallaVeranoContainer = document.getElementById('malla-verano-container');
    const pozoCursos           = document.getElementById('pozo-cursos');
    const pozoEmpty            = document.getElementById('pozo-empty');
    const pozoCount            = document.getElementById('pozo-count');
    const tooltipGlobal        = document.getElementById('tooltip-global');
    const veranoMaster         = document.getElementById('contenedor-verano-master');

    let sortables         = [];
    let diccionarioCursos = {};
    let facultadActual    = 'ingenieria';
    let descuentoActual   = 'scotiabank';


    // Render de tableros (Mallas y Verano)
    function construirTableros() {
        mallaContainer.innerHTML       = '';
        mallaVeranoContainer.innerHTML = '';

        // Ciclos regulares 1-12
        for (let i = 1; i <= 12; i++) {
            mallaContainer.insertAdjacentHTML('beforeend', `
            <div class="tier-row" id="fila-ciclo-${i}" data-ciclo="${i}" data-tipo="regular" style="display:none">
                <div class="tier-label" id="label-ciclo-${i}">
                    <span class="tier-num">${i}</span>
                    <span class="tier-name">Ciclo ${i}${i > 10 ? ' ⚠' : ''}</span>
                    <div class="tier-stats">
                        <span class="stat-chip stat-horas"><span class="contador-horas">0</span>h sem.</span>
                        <span class="stat-chip"><span class="contador-creditos">0</span> crd</span>
                        <span class="ciclo-costo-val"><b class="costo-val">S/ 0.00</b><span class="ciclo-mat mat-info"></span></span>
                    </div>
                </div>
                <div class="tier-dropzone zona-ciclo" id="ciclo-${i}"></div>
            </div>`);
        }

        // Ciclos de verano 1-5
        for (let v = 1; v <= 5; v++) {
            mallaVeranoContainer.insertAdjacentHTML('beforeend', `
            <div class="tier-row" id="fila-verano-${v}" data-ciclo="v${v}" data-tipo="verano" style="display:none">
                <div class="tier-label" id="label-verano-${v}">
                    <span class="tier-num">${v}</span>
                    <span class="tier-name">Verano ${v}</span>
                    <div class="tier-stats">
                        <span class="stat-chip stat-horas"><span class="contador-horas">0</span>h sem.</span>
                        <span class="stat-chip"><span class="contador-creditos">0</span> crd</span>
                        <span class="ciclo-costo-val"><b class="costo-val">S/ 0.00</b><span class="ciclo-mat mat-info"></span></span>
                    </div>
                </div>
                <div class="tier-dropzone zona-ciclo" id="verano-${v}"></div>
            </div>`);
        }
    }
    construirTableros();


    // Configuración de Drag & Drop (Sortable)
    // TODO: Modificar reglas de arrastre aquí
    function inicializarSortable() {
        sortables.forEach(s => s.destroy());
        sortables = [];

        document.querySelectorAll('.tier-dropzone').forEach(zona => {
            sortables.push(new Sortable(zona, {
                group: 'cursos-malla',
                animation: 120,
                ghostClass: 'sortable-ghost',
                chosenClass: 'sortable-chosen',
                // Bloquear drag de aprobados/convalidados y separadores
                filter: '.aprobado, .convalidado, .separador-ciclo, .pozo-empty',
                onEnd: (evt) => {
                    // Si la tarjeta llega al pozo → re-ordenar por ciclo de origen
                    if (evt.to === pozoCursos) ordenarPozo();
                    actualizarContadorPozo();
                    recalcularFinanzas();
                }
            }));
        });
    }
    inicializarSortable();


    // Lectura de archivo Excel (formato fijo UTP)
    document.getElementById('excel-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Actualizar texto del botón upload
        const wrap = document.getElementById('upload-wrap');
        const txt  = document.getElementById('upload-text');
        txt.textContent = file.name.length > 22 ? file.name.slice(0, 20) + '…' : file.name;
        wrap.classList.add('loaded');

        const reader = new FileReader();
        reader.onload = ev => {
            const data = new Uint8Array(ev.target.result);
            const wb   = XLSX.read(data, { type: 'array' });
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
            procesarMallaExcel(json);
        };
        reader.readAsArrayBuffer(file);
    });


    function procesarMallaExcel(datos) {
        // Limpiar estado previo
        // Remover todas las tarjetas del pozo (mantener el empty placeholder)
        Array.from(pozoCursos.children).forEach(el => {
            if (el !== pozoEmpty) el.remove();
        });
        pozoEmpty.style.display = 'none';
        document.querySelectorAll('.zona-ciclo').forEach(z => z.innerHTML = '');
        diccionarioCursos = {};

        let cicloActual = 1;

        // Primera pasada: construir diccionario de cursos
        datos.forEach(fila => {
            const codigoRaw = String(fila['Código Curso'] || '').trim();
            if (!codigoRaw) return;

            // Detectar cabecera de ciclo
            if (codigoRaw.toLowerCase().includes('ciclo')) {
                const num = codigoRaw.match(/\d+/);
                if (num) cicloActual = parseInt(num[0]);
                return;
            }
            if (!fila['Nombre Curso'] || codigoRaw.toLowerCase().includes('nivelación')) return;

            const estado    = String(fila['Estado(***)'] || 'PENDIENTE').trim().toUpperCase();
            const tipoBruto = String(fila['Tipo'] || 'O').trim();

            diccionarioCursos[codigoRaw] = {
                codigo:       codigoRaw,
                nombre:       String(fila['Nombre Curso']).trim(),
                horas:        parseFloat(fila['Horas Semanales(*)']) || 3,
                creditos:     parseFloat(fila['Créditos'])           || 0,
                tipo:         tipoBruto.toUpperCase(),
                estado:       estado,
                prerequisitos: String(fila['Pre-Requisito'] || '')
                                  .split(',').map(s => s.trim()).filter(Boolean),
                habilitaA:    [],
                cicloOrigen:  cicloActual
            };
        });

        // Segunda pasada: construir habilitaA (inverso de prerequisitos)
        Object.values(diccionarioCursos).forEach(curso => {
            curso.prerequisitos.forEach(pre => {
                if (diccionarioCursos[pre]) diccionarioCursos[pre].habilitaA.push(curso.nombre);
            });
        });

        // Agrupar pendientes por ciclo y colocar aprobados en sus ciclos
        const pendientesPorCiclo = {};

        Object.values(diccionarioCursos).forEach(curso => {
            const tarjeta    = crearTarjeta(curso);
            const esAprobado = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);

            if (esAprobado) {
                const cont = document.getElementById(`ciclo-${curso.cicloOrigen}`);
                if (cont) cont.appendChild(tarjeta);
            } else {
                if (!pendientesPorCiclo[curso.cicloOrigen]) pendientesPorCiclo[curso.cicloOrigen] = [];
                pendientesPorCiclo[curso.cicloOrigen].push(tarjeta);
            }
        });

        // Volcar pendientes al pozo con separadores de ciclo
        Object.keys(pendientesPorCiclo).sort((a, b) => a - b).forEach(ciclo => {
            const sep       = document.createElement('div');
            sep.className   = 'separador-ciclo';
            sep.textContent = `Ciclo ${ciclo}`;
            pozoCursos.appendChild(sep);
            pendientesPorCiclo[ciclo].forEach(t => pozoCursos.appendChild(t));
        });

        if (Object.keys(pendientesPorCiclo).length === 0) pozoEmpty.style.display = 'flex';

        // Evaluar estado de ciclos para colorearlos
        for (let i = 1; i <= 12; i++) {
            const zona = document.getElementById(`ciclo-${i}`);
            const label = document.getElementById(`label-ciclo-${i}`);
            if (!zona || !label) continue;
            
            const aprobados = zona.querySelectorAll('.curso-card.aprobado, .curso-card.convalidado').length;
            
            label.classList.remove('ciclo-aprobado', 'ciclo-adelantado');
            if (aprobados >= 3) {
                label.classList.add('ciclo-aprobado');
            } else if (aprobados >= 1) {
                label.classList.add('ciclo-adelantado');
            }
        }

        aplicarRangoVisibilidad();
        actualizarContadorPozo();
        recalcularFinanzas();
    }


    // Creación de Tarjetas de Curso
    function crearTarjeta(curso) {
        const tarjeta = document.createElement('div');
        tarjeta.dataset.horas       = curso.horas;
        tarjeta.dataset.creditos    = curso.creditos;
        tarjeta.dataset.estado      = curso.estado;
        tarjeta.dataset.cicloOrigen = curso.cicloOrigen;

        const esAprobado   = ['APROBADO', 'CONVALIDADO'].includes(curso.estado);
        const claseEst     = esAprobado ? curso.estado.toLowerCase() : '';
        const claseT       = curso.tipo === 'O' ? 'obligatorio' : 'electivo';
        const textoT       = curso.tipo === 'O' ? 'Obligatorio' : 'Electivo';
        const claseTag     = curso.tipo === 'O' ? 'obl' : 'ele';
        // Cursos que NO habilitan ningún otro: marcador visual superior
        const sinSucesores = !esAprobado && curso.habilitaA.length === 0;
        if (sinSucesores) tarjeta.classList.add('no-habilita');

        tarjeta.className = (`curso-card ${claseEst} ${claseT}${sinSucesores ? ' no-habilita' : ''}`).trim();

        // Contenido del tooltip
        const preReqHTML = curso.prerequisitos.length > 0
            ? `<b><i class="fas fa-lock"></i> Prerrequisitos:</b><br>${curso.prerequisitos.map(c => diccionarioCursos[c]?.nombre || c).join('<br>')}`
            : `<i class="fas fa-lock-open"></i> Sin prerrequisitos`;
        const habHTML = curso.habilitaA.length > 0
            ? `<b><i class="fas fa-key"></i> Habilita:</b><br>${curso.habilitaA.join('<br>')}`
            : `<i class="fas fa-ban"></i> No es prerrequisito de ningún otro curso`;

        // Marcador × solo si no abre cursos (y es pendiente)
        const noHabMark = sinSucesores
            ? `<span class="no-hab-mark" title="Este curso no abre ningún otro">×</span>`
            : '';

        tarjeta.innerHTML = `
            ${noHabMark}
            <div class="curso-titulo" title="${curso.nombre}">${curso.nombre}</div>
            <div class="curso-tags">
                <span class="ctag">C${curso.cicloOrigen}</span>
                <span class="ctag ctag-horas">${curso.horas}h</span>
                <span class="ctag">${curso.creditos} crd</span>
                <span class="ctag ${claseTag}">${textoT}</span>
            </div>
            <i class="fas fa-info-circle btn-info-flotante"></i>
        `;


        // Tooltip hover
        const btn = tarjeta.querySelector('.btn-info-flotante');
        btn.addEventListener('mouseenter', e => {
            tooltipGlobal.innerHTML = `
                <div class="tt-req">${preReqHTML}</div>
                <hr>
                <div class="tt-hab">${habHTML}</div>
            `;
            tooltipGlobal.style.display = 'block';
            const rect = e.target.getBoundingClientRect();
            tooltipGlobal.style.top  = `${rect.bottom + 5}px`;
            tooltipGlobal.style.left = `${Math.min(rect.left, window.innerWidth - 230)}px`;
        });
        btn.addEventListener('mouseleave', () => { tooltipGlobal.style.display = 'none'; });

        return tarjeta;
    }


    // Ordenamiento del pozo por ciclo de origen
    // Se llama cuando una tarjeta regresa al pozo desde un ciclo.
    // Mantiene el orden limpio y predecible sin intervención manual.
    function ordenarPozo() {
        const tarjetas = Array.from(pozoCursos.querySelectorAll('.curso-card'));
        // Limpiar manteniendo solo el placeholder vacío
        Array.from(pozoCursos.children).forEach(el => { if (el !== pozoEmpty) el.remove(); });

        if (tarjetas.length === 0) {
            pozoEmpty.style.display = 'flex';
            return;
        }
        pozoEmpty.style.display = 'none';

        const grupos = {};
        tarjetas.forEach(t => {
            const c = t.dataset.cicloOrigen;
            if (!grupos[c]) grupos[c] = [];
            grupos[c].push(t);
        });

        Object.keys(grupos).sort((a, b) => a - b).forEach(ciclo => {
            const sep       = document.createElement('div');
            sep.className   = 'separador-ciclo';
            sep.textContent = `Ciclo ${ciclo}`;
            pozoCursos.appendChild(sep);
            grupos[ciclo].forEach(t => pozoCursos.appendChild(t));
        });
    }


    // Visibilidad de ciclos según rango seleccionado
    function clamp(val, min, max) { return Math.min(max, Math.max(min, val)); }

    function aplicarRangoVisibilidad() {
        const valInicio = parseInt(document.getElementById('sim-inicio').value);
        const valFin    = parseInt(document.getElementById('sim-fin').value);
        const valVerano = parseInt(document.getElementById('cant-veranos').value);

        let inicio = isNaN(valInicio) ? 1 : clamp(valInicio, 1, 12);
        let fin    = isNaN(valFin) ? 12 : clamp(valFin, 1, 12);
        if (fin < inicio) fin = inicio;  // Evitar rangos inválidos

        const veranoOn     = document.getElementById('toggle-verano').checked;
        const cantVeranos  = isNaN(valVerano) ? 5 : clamp(valVerano, 1, 5);

        // Ciclos regulares
        document.querySelectorAll('.tier-row[data-tipo="regular"]').forEach(fila => {
            const n = parseInt(fila.dataset.ciclo);
            fila.style.display = (n >= inicio && n <= fin) ? 'flex' : 'none';
        });

        // Veranos
        veranoMaster.style.display = veranoOn ? 'block' : 'none';
        if (veranoOn) {
            document.querySelectorAll('.tier-row[data-tipo="verano"]').forEach(fila => {
                const v = parseInt(fila.dataset.ciclo.replace('v', ''));
                fila.style.display = v <= cantVeranos ? 'flex' : 'none';
            });
        }

        recalcularFinanzas();
    }

    // Clamping estricto: corrige el valor visible si el usuario escribe fuera del rango
    function clampInput(el, min, max) {
        if (el.value === '') return;
        const v = parseInt(el.value);
        if (isNaN(v) || v < min) el.value = min;
        else if (v > max)        el.value = max;
    }

    const elInicio = document.getElementById('sim-inicio');
    const elFin    = document.getElementById('sim-fin');

    elInicio.addEventListener('input', aplicarRangoVisibilidad);
    elInicio.addEventListener('blur',  () => { clampInput(elInicio, 1, 12); aplicarRangoVisibilidad(); });

    elFin.addEventListener('input', aplicarRangoVisibilidad);
    elFin.addEventListener('blur',  () => { clampInput(elFin, 1, 12); aplicarRangoVisibilidad(); });


    // Toggle de modo Verano
    const toggleVerano  = document.getElementById('toggle-verano');
    const veranoTag     = document.getElementById('verano-tag');
    const veranoQtyWrap = document.getElementById('verano-qty-wrap');

    toggleVerano.addEventListener('change', () => {
        const on = toggleVerano.checked;
        veranoTag.textContent = on ? 'Activado' : 'Desactivado';
        veranoTag.classList.toggle('on', on);
        veranoQtyWrap.classList.toggle('show', on);
        aplicarRangoVisibilidad();
    });

    const elVeranos = document.getElementById('cant-veranos');
    elVeranos.addEventListener('input', aplicarRangoVisibilidad);
    elVeranos.addEventListener('blur',  () => { clampInput(elVeranos, 1, 5); aplicarRangoVisibilidad(); });

    // Llamada inicial para aplicar valores por defecto del HTML
    aplicarRangoVisibilidad();


    // Comportamiento de Dropdowns (Facultad y Pago)
    function bindDropdown(wrapperId, labelId, iconSelector, onSelect) {
        const wrap = document.getElementById(wrapperId);
        if (!wrap) return;
        wrap.querySelectorAll('.dropdown-item[data-value]').forEach(item => {
            item.addEventListener('click', () => {
                wrap.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                document.getElementById(labelId).textContent = item.dataset.label;

                // Actualizar ícono en el toggle
                const iconEl = wrap.querySelector(iconSelector);
                if (iconEl && item.dataset.icon) {
                    iconEl.className = `fas ${item.dataset.icon}`;
                }

                onSelect(item.dataset.value);
            });
        });
    }

    bindDropdown('dd-facultad', 'facultad-label', '.dd-icon i', val => {
        facultadActual = val;
        recalcularFinanzas();
    });

    bindDropdown('dd-pago', 'pago-label', '.dd-icon i', val => {
        descuentoActual = val;
        recalcularFinanzas();
    });


    // Contador del pozo de cursos pendientes
    function actualizarContadorPozo() {
        const total = pozoCursos.querySelectorAll('.curso-card[data-estado="PENDIENTE"]').length;
        pozoCount.textContent = total;
        if (total === 0 && Object.keys(diccionarioCursos).length > 0) {
            pozoEmpty.style.display = 'flex';
        }
    }


    // Acción de Reseteo
    document.getElementById('btn-reset').addEventListener('click', () => {
        // Mover SOLO pendientes de los ciclos al pozo
        document.querySelectorAll('.zona-ciclo .curso-card[data-estado="PENDIENTE"]').forEach(card => {
            pozoCursos.appendChild(card);
        });
        ordenarPozo();
        actualizarContadorPozo();
        recalcularFinanzas();
    });


    // Exportar malla como imagen (Canvas)
    document.getElementById('btn-export').addEventListener('click', () => {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'background:#EDEEF1;padding:20px;display:inline-block;min-width:600px;font-family:Inter,sans-serif;';

        wrapper.appendChild(document.getElementById('malla-container').cloneNode(true));

        if (veranoMaster.style.display !== 'none') {
            wrapper.appendChild(veranoMaster.cloneNode(true));
        }

        document.body.appendChild(wrapper);
        html2canvas(wrapper, { backgroundColor: '#EDEEF1', scale: 2 }).then(canvas => {
            const link    = document.createElement('a');
            link.download = 'Malla_Proyectada_UTP.png';
            link.href     = canvas.toDataURL('image/png');
            link.click();
            document.body.removeChild(wrapper);
        });
    });


    // Motor Financiero (Cálculo de Costos)
    // TODO: Si cambian las tarifas, actualizar la lógica de costos aquí
    function recalcularFinanzas() {
        const reglas     = ESTRUCTURA_TARIFARIA[facultadActual];
        const factorDesc = 1 - DESCUENTOS[descuentoActual];
        const matReg     = COSTOS_FIJOS.matriculaRegular;
        const matVer     = COSTOS_FIJOS.matriculaVerano;
        const limCredVer = COSTOS_FIJOS.limiteCreditosVerano;

        let cuotaMax = 0;

        document.querySelectorAll('.tier-row').forEach(fila => {
            if (fila.style.display === 'none') return;

            const zona      = fila.querySelector('.zona-ciclo');
            const etiqueta  = fila.querySelector('.tier-label');
            const cHoras    = fila.querySelector('.contador-horas');
            const cCred     = fila.querySelector('.contador-creditos');
            const costoVal  = fila.querySelector('.costo-val');
            const matTag    = fila.querySelector('.mat-info');
            const isVerano  = fila.dataset.tipo === 'verano';

            let horasBrutas = 0;
            let credBrutos  = 0;

            zona.querySelectorAll('.curso-card[data-estado="PENDIENTE"]').forEach(c => {
                horasBrutas += parseFloat(c.dataset.horas)    || 0;
                credBrutos  += parseFloat(c.dataset.creditos) || 0;
            });

            // Redondeo seguro contra float
            const horas   = Math.round(horasBrutas * 100) / 100;
            const creditos = Math.round(credBrutos  * 100) / 100;

            if (cHoras) cHoras.textContent  = horas;
            if (cCred)  cCred.textContent   = creditos;

            // En verano: horas × 2 para ubicar el tramo tarifario
            const horasTar = isVerano ? horas * 2 : horas;
            let costoBase  = 0;

            if (horasTar > 0) {
                for (const r of reglas.rangos) {
                    if (horasTar >= r.min && horasTar <= r.max) { costoBase = r.precio; break; }
                }
                if (horasTar > reglas.limiteHoras) {
                    costoBase = reglas.precioBase + (horasTar - reglas.limiteHoras) * reglas.horaExtra;
                }
            }

            const costoFinal  = costoBase * factorDesc;
            const matActual   = isVerano ? matVer : matReg;

            if (horas > 0) {
                if (costoVal) costoVal.textContent = `S/ ${costoFinal.toFixed(2)}`;
                if (matTag)   matTag.textContent   = `+S/${matActual.toFixed(0)} mat.`;
            } else {
                if (costoVal) costoVal.textContent = 'S/ 0.00';
                if (matTag)   matTag.textContent   = '';
            }

            // Alerta de peligro
            const excesoH   = horasTar > reglas.limiteHoras;
            const excesoCV  = isVerano && creditos > limCredVer;
            etiqueta.classList.toggle('peligro', excesoH || excesoCV);

            if (costoFinal > cuotaMax) cuotaMax = costoFinal;
        });

        document.getElementById('costo-global').textContent = `S/ ${cuotaMax.toFixed(2)}`;
        document.getElementById('cost-note').textContent    =
            cuotaMax > 0 ? 'Cuota más alta entre ciclos visibles' : 'Sin cursos asignados';
    }

});