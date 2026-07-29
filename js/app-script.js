document.addEventListener('DOMContentLoaded', () => {
    // 0. Disparar el Modal de Bienvenida automáticamente
    const modalBienvenida = new bootstrap.Modal(document.getElementById('modalBienvenida'));
    modalBienvenida.show();

    const mallaContainer = document.getElementById('malla-container');
    const pozoCursos = document.getElementById('pozo-cursos');
    const tooltipGlobal = document.getElementById('tooltip-global');
    let sortables = [];
    let diccionarioCursos = {};

    // 1. Construir 12 Ciclos de Simulación
    for (let i = 1; i <= 12; i++) {
        let nombreCiclo = i > 10 ? (i === 11 ? "VERANO 1" : "VERANO 2") : `CICLO ${i}`;
        
        const htmlCiclo = `
        <div class="tier-row" id="fila-ciclo-${i}" data-ciclo="${i}">
            <div class="tier-label">${nombreCiclo}<br>
                <span class="badge bg-dark text-white mt-2"><span class="contador-horas">0</span>h</span>
            </div>
            <div class="tier-dropzone zona-ciclo" id="ciclo-${i}"></div>
        </div>`;
        mallaContainer.insertAdjacentHTML('beforeend', htmlCiclo);
    }

    function inicializarSortable() {
        const zonasDrop = document.querySelectorAll('.tier-dropzone');
        zonasDrop.forEach(zona => {
            sortables.push(new Sortable(zona, {
                group: 'cursos-malla',
                animation: 100,
                filter: '.aprobado, .convalidado, .separador-ciclo', 
                onEnd: (evt) => {
                    if (evt.to.id === 'pozo-cursos') ordenarPozo();
                    recalcularFinanzas();
                }
            }));
        });
    }
    inicializarSortable();

    document.getElementById('excel-upload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evento) {
            const data = new Uint8Array(evento.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            const jsonCursos = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: "" });
            procesarMallaExcel(jsonCursos);
        };
        reader.readAsArrayBuffer(file);
    });

    function procesarMallaExcel(datos) {
        pozoCursos.innerHTML = '';
        document.querySelectorAll('.zona-ciclo').forEach(z => z.innerHTML = '');
        diccionarioCursos = {};
        let cicloActual = 1;

        datos.forEach(fila => {
            const codigoRaw = String(fila['Código Curso']).trim();
            if (codigoRaw.toLowerCase().includes('ciclo')) {
                const num = codigoRaw.match(/\d+/);
                if (num) cicloActual = parseInt(num[0]);
                return; 
            }
            if (!fila['Nombre Curso'] || codigoRaw.toLowerCase().includes('nivelación')) return;

            const estado = String(fila['Estado(***)'] || 'PENDIENTE').trim().toUpperCase();
            const tipoBruto = fila['Tipo'] || 'O';
            
            diccionarioCursos[codigoRaw] = {
                codigo: codigoRaw,
                nombre: String(fila['Nombre Curso']).trim(),
                horas: parseFloat(fila['Horas Semanales(*)']) || 3,
                creditos: fila['Créditos'] || '-',
                tipo: tipoBruto.toUpperCase(),
                estado: estado,
                prerequisitos: String(fila['Pre-Requisito'] || '').split(',').map(s => s.trim()).filter(s => s),
                habilitaA: [],
                cicloOrigen: cicloActual
            };
        });

        Object.values(diccionarioCursos).forEach(curso => {
            curso.prerequisitos.forEach(pre => {
                if (diccionarioCursos[pre]) diccionarioCursos[pre].habilitaA.push(curso.nombre);
            });
        });

        let pendientesPorAgrupar = {};

        Object.values(diccionarioCursos).forEach(curso => {
            const tarjeta = document.createElement('div');
            
            // Ya no escalamos por width. El CSS mantiene cuadros fijos de 175px x 115px
            tarjeta.setAttribute('data-horas', curso.horas);
            tarjeta.setAttribute('data-estado', curso.estado);
            tarjeta.setAttribute('data-ciclo-origen', curso.cicloOrigen);
            
            let bordeClase = curso.estado === 'APROBADO' ? 'aprobado' : (curso.estado === 'CONVALIDADO' ? 'convalidado' : '');
            
            // Asignar clase Obligatorio/Electivo para la raya superior
            let claseTipo = curso.tipo === 'O' ? 'obligatorio' : 'electivo';
            let textoTipo = curso.tipo === 'O' ? 'Obligatorio' : 'Electivo';

            tarjeta.className = `curso-card ${bordeClase} ${claseTipo}`;
            
            let preReqHTML = curso.prerequisitos.length > 0 
                ? `<b><i class="fas fa-lock"></i> Prerrequisitos:</b><br>${curso.prerequisitos.map(c => diccionarioCursos[c]?.nombre || c).join('<br>')}` 
                : `<i class="fas fa-lock-open"></i> Sin prerrequisitos`;
            let habilitaHTML = curso.habilitaA.length > 0 
                ? `<b><i class="fas fa-key"></i> Habilita:</b><br>${curso.habilitaA.join('<br>')}` 
                : `<i class="fas fa-ban"></i> No abre cursos`;

            // Estructura de Texto Solicitada: C11 | 4h | 3 crdts | Obligatorio
            tarjeta.innerHTML = `
                <div class="curso-titulo" title="${curso.nombre}">${curso.nombre}</div>
                <div class="curso-subinfo">
                    C${curso.cicloOrigen} | ${curso.horas}h | ${curso.creditos} crdts<br>
                    <b>${textoTipo}</b>
                </div>
                <i class="fas fa-info-circle btn-info-flotante"></i>
            `;
            
            const btnInfo = tarjeta.querySelector('.btn-info-flotante');
            btnInfo.addEventListener('mouseenter', (e) => {
                tooltipGlobal.innerHTML = `<div class="text-danger">${preReqHTML}</div><hr style="margin:8px 0; border-color:#555;"><div class="text-info">${habilitaHTML}</div>`;
                tooltipGlobal.style.display = 'block';
                const rect = e.target.getBoundingClientRect();
                tooltipGlobal.style.top = `${rect.bottom + 5}px`;
                tooltipGlobal.style.left = `${Math.min(rect.left, window.innerWidth - 240)}px`;
            });
            btnInfo.addEventListener('mouseleave', () => tooltipGlobal.style.display = 'none');
            
            if (curso.estado === 'PENDIENTE') {
                if (!pendientesPorAgrupar[curso.cicloOrigen]) pendientesPorAgrupar[curso.cicloOrigen] = [];
                pendientesPorAgrupar[curso.cicloOrigen].push(tarjeta);
            } else {
                const contenedor = document.getElementById(`ciclo-${curso.cicloOrigen}`);
                if(contenedor) contenedor.appendChild(tarjeta);
            }
        });

        Object.keys(pendientesPorAgrupar).sort((a,b) => a - b).forEach(ciclo => {
            const sep = document.createElement('div');
            sep.className = 'separador-ciclo';
            sep.textContent = `CICLO ${ciclo}`;
            pozoCursos.appendChild(sep);
            pendientesPorAgrupar[ciclo].forEach(t => pozoCursos.appendChild(t));
        });

        aplicarRangoVisibilidad();
        recalcularFinanzas();
    }

    function ordenarPozo() {
        const tarjetas = Array.from(pozoCursos.querySelectorAll('.curso-card'));
        pozoCursos.innerHTML = ''; 
        let grupos = {};
        tarjetas.forEach(t => {
            let ciclo = t.getAttribute('data-ciclo-origen');
            if(!grupos[ciclo]) grupos[ciclo] = [];
            grupos[ciclo].push(t);
        });
        Object.keys(grupos).sort((a,b) => a - b).forEach(ciclo => {
            const sep = document.createElement('div');
            sep.className = 'separador-ciclo';
            sep.textContent = `CICLO ${ciclo}`;
            pozoCursos.appendChild(sep);
            grupos[ciclo].forEach(t => pozoCursos.appendChild(t));
        });
    }

    // 4. Lógica de Rango de Visibilidad
    function aplicarRangoVisibilidad() {
        const inicio = parseInt(document.getElementById('sim-inicio').value) || 1;
        const fin = parseInt(document.getElementById('sim-fin').value) || 12;

        document.querySelectorAll('.tier-row').forEach(fila => {
            const cicloId = parseInt(fila.getAttribute('data-ciclo'));
            // Mostrar solo si el ciclo está dentro del rango elegido por el usuario
            if (cicloId >= inicio && cicloId <= fin) {
                fila.style.display = 'flex';
            } else {
                fila.style.display = 'none';
            }
        });
    }

    document.getElementById('sim-inicio').addEventListener('change', aplicarRangoVisibilidad);
    document.getElementById('sim-fin').addEventListener('change', aplicarRangoVisibilidad);

    // 5. Botones y Finanzas
    document.getElementById('btn-reset').addEventListener('click', () => {
        document.querySelectorAll('.zona-ciclo .curso-card[data-estado="PENDIENTE"]').forEach(card => {
            pozoCursos.appendChild(card);
        });
        ordenarPozo();
        recalcularFinanzas();
    });

    document.getElementById('btn-export').addEventListener('click', () => {
        html2canvas(document.getElementById('malla-container'), { backgroundColor: '#121212', scale: 2 })
            .then(canvas => {
                const link = document.createElement('a');
                link.download = 'Plan_Estrategico_UTP.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
    });

    function recalcularFinanzas() {
        const carrera = document.getElementById('selector-carrera').value;
        const descKey = document.getElementById('selector-descuento').value;
        const reglas = ESTRUCTURA_TARIFARIA[carrera];
        const factorDesc = 1 - DESCUENTOS[descKey];
        
        let cuotaMasAltaGlobal = 0;

        document.querySelectorAll('.tier-row').forEach(fila => {
            if (fila.style.display === 'none') return; // No calcular ciclos ocultos

            const zona = fila.querySelector('.zona-ciclo');
            const etiqueta = fila.querySelector('.tier-label');
            const displayHoras = fila.querySelector('.contador-horas');
            
            let displayCosto = fila.querySelector('.ciclo-costo');
            if (!displayCosto) {
                displayCosto = document.createElement('span');
                displayCosto.className = 'ciclo-costo mt-1';
                etiqueta.appendChild(displayCosto);
            }

            let horas = 0;
            zona.querySelectorAll('.curso-card[data-estado="PENDIENTE"]').forEach(c => horas += parseFloat(c.getAttribute('data-horas')));
            displayHoras.textContent = horas;

            let costoBase = 0;
            if (horas > 0) {
                for (let r of reglas.rangos) {
                    if (horas >= r.min && horas <= r.max) { costoBase = r.precio; break; }
                }
                if (horas > reglas.limiteHoras) {
                    costoBase = reglas.precioBase + ((horas - reglas.limiteHoras) * reglas.horaExtra);
                }
            }

            const costoFinal = costoBase * factorDesc;
            displayCosto.innerHTML = horas > 0 ? `<b>S/ ${costoFinal.toFixed(2)}</b>` : 'S/ 0.00';

            if (horas > reglas.limiteHoras) {
                etiqueta.classList.add('peligro');
                displayCosto.classList.replace('text-success', 'text-white');
            } else {
                etiqueta.classList.remove('peligro');
                displayCosto.classList.replace('text-white', 'text-success');
            }

            if (costoFinal > cuotaMasAltaGlobal) cuotaMasAltaGlobal = costoFinal;
        });

        document.getElementById('costo-global').textContent = `S/ ${cuotaMasAltaGlobal.toFixed(2)}`;
    }

    document.getElementById('selector-carrera').addEventListener('change', recalcularFinanzas);
    document.getElementById('selector-descuento').addEventListener('change', recalcularFinanzas);
});