import { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api/alumnos`;

const CARRERAS_INFO = {
  IRD: {
    nombre: 'T.S.U. en Infraestructura de Redes Digitales',
    grupoDefault: 'IRD-401',
    cuatrimestre: '4°',
    tutor: 'M. en D. Arturo Hernández Jiménez'
  },
  LITIID: {
    nombre: 'Lic. en Ing. en Tecnologías de la Información e Innovación Digital',
    grupoDefault: 'LITIID-701',
    cuatrimestre: '7°',
    tutor: 'Mtra. Claudia Elena Ríos Mendoza'
  },
  IRIC: {
    nombre: 'Ing. en Redes Inteligentes y Ciberseguridad',
    grupoDefault: 'IRIC-1001',
    cuatrimestre: '10°',
    tutor: 'Ing. Roberto Carlos Domínguez Navarro'
  }
};

const PREFIJOS_MUNICIPIOS = {
  '544': 'Nicolás Romero',
  '529': 'Atizapán de Zaragoza',
  '540': 'Tlalnepantla de Baz',
  '541': 'Tlalnepantla de Baz',
  '547': 'Cuautitlán Izcalli',
  '548': 'Cuautitlán',
  '549': 'Tultitlán',
  '550': 'Ecatepec de Morelos',
  '530': 'Naucalpan de Juárez',
  '531': 'Naucalpan de Juárez',
  '546': 'Tepotzotlán',
  '543': 'Villa del Carbón',
  '545': 'Isidro Fabela'
};

function LogoUTFV({ ancho = 110 }) {
  return (
    <svg width={ancho} viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg" aria-label="Logo UTFV">
      <circle cx="54" cy="24" r="11" fill="#C48F4B" />
      <circle cx="82" cy="18" r="11" fill="#C48F4B" />
      <circle cx="82" cy="44" r="11" fill="#C48F4B" />
      <path
        d="M44 58 H78 V108 C78 125 89 135 105 135 C121 135 132 125 132 108 V40 H166 V108 C166 144 140 166 105 166 C70 166 44 144 44 108 Z"
        fill="#C48F4B"
      />
      <path
        d="M126 18 H246 V48 H203 V164 H195 C178 164 168 154 168 137 V48 H126 Z"
        fill="#6B2A32"
      />
      <text
        x="212"
        y="156"
        fill="#A85327"
        fontFamily="Arial Black, sans-serif"
        fontWeight="900"
        fontSize="76"
      >
        FV
      </text>
      <line x1="25" y1="174" x2="335" y2="174" stroke="#C48F4B" strokeWidth="2.5" />
      <text
        x="180"
        y="193"
        textAnchor="middle"
        fill="#4A4A4A"
        fontFamily="Segoe UI, Arial, sans-serif"
        fontWeight="700"
        fontSize="14.5"
        letterSpacing="1.2"
      >
        UNIVERSIDAD TECNOLÓGICA
      </text>
      <text
        x="180"
        y="215"
        textAnchor="middle"
        fill="#9E1B32"
        fontFamily="Arial Black, sans-serif"
        fontWeight="900"
        fontSize="21.5"
        letterSpacing="0.8"
      >
        FIDEL VELÁZQUEZ
      </text>
    </svg>
  );
}

function MembreteUTFV({ tituloDocumento }) {
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="membrete-oficial">
      <div className="membrete-contenido">
        <LogoUTFV ancho={105} />
        <div className="membrete-textos">
          <div className="membrete-gob">GOBIERNO DEL ESTADO DE MÉXICO</div>
          <div className="membrete-uni">UNIVERSIDAD TECNOLÓGICA FIDEL VELÁZQUEZ</div>
          <div className="membrete-depto">
            Dirección de Servicios Escolares y Control Académico
          </div>
          <div className="membrete-doc-titulo">{tituloDocumento}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.76rem', color: '#6b7280' }}>
          <strong>Emisión</strong>
          <div>{fechaHoy}</div>
          <div style={{ marginTop: '3px', color: '#9E1B32', fontWeight: '600' }}>
            Nicolás Romero, Méx.
          </div>
        </div>
      </div>
    </div>
  );
}

function dibujarTablaCentradaPDF(doc, startY, columnas, filas) {
  let y = startY;
  const altoEncabezado = 8.5;

  doc.setFillColor(158, 27, 50);
  doc.rect(10, y, 190, altoEncabezado, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);

  columnas.forEach((col) => {
    doc.text(col.titulo, col.x + col.w / 2, y + 5.8, { align: 'center' });
  });

  y += altoEncabezado;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);

  filas.forEach((fila, idxFila) => {
    const textosDivididos = columnas.map((col, i) =>
      doc.splitTextToSize(String(fila[i] ?? '-'), col.w - 2.5)
    );
    const maxLineas = Math.max(...textosDivididos.map((t) => t.length));
    const altoFila = Math.max(8, maxLineas * 4 + 3.5);

    if (y + altoFila > 272) {
      doc.addPage();
      y = 18;
    }

    if (idxFila % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(10, y, 190, altoFila, 'F');
    }

    doc.setDrawColor(225, 228, 232);
    doc.setTextColor(30, 30, 35);

    columnas.forEach((col, i) => {
      doc.rect(col.x, y, col.w, altoFila);
      const lineas = textosDivididos[i];
      const inicioTextoY = y + (altoFila - (lineas.length - 1) * 4) / 2 + 1.2;
      doc.text(lineas, col.x + col.w / 2, inicioTextoY, { align: 'center' });
    });

    y += altoFila;
  });

  return y;
}

// Función compartida para recalcular promedio ordinario, EGO y calificación final
function recalcularFilaCalificacion(actual, campo, valor) {
  const siguiente = { ...actual, [campo]: valor };

  const validos = [siguiente.parcial_1, siguiente.parcial_2, siguiente.parcial_3]
    .filter((v) => v !== '' && v !== null && !isNaN(Number(v)))
    .map(Number);

  const promOrd =
    validos.length > 0
      ? Number((validos.reduce((acc, n) => acc + n, 0) / validos.length).toFixed(1))
      : '';

  const tieneNotaEgo =
    siguiente.calificacion_ego !== '' &&
    siguiente.calificacion_ego !== null &&
    !isNaN(Number(siguiente.calificacion_ego));

  if (tieneNotaEgo) {
    siguiente.final = Number(siguiente.calificacion_ego).toFixed(1);
    siguiente.ego = true;
  } else if (promOrd !== '') {
    siguiente.final = promOrd.toFixed(1);
    siguiente.ego = promOrd < 7.0;
  } else {
    siguiente.final = '';
    siguiente.ego = false;
  }

  return siguiente;
}

function App() {
  const [autenticado, setAutenticado] = useState(
    () => sessionStorage.getItem('utfv_admin_auth') === 'true'
  );
  const [loginData, setLoginData] = useState({ usuario: '', password: '' });
  const [errorLogin, setErrorLogin] = useState('');
  const [validandoLogin, setValidandoLogin] = useState(false);

  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [pestana, setPestana] = useState('padron');
  const [mensaje, setMensaje] = useState(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');

  const [nuevoAspirante, setNuevoAspirante] = useState({
    nombre: '',
    apellido_p: '',
    apellido_m: '',
    edad: '',
    peso: '',
    estatura: '',
    genero: 'Masculino',
    telefono: '',
    correo: '',
    calle: '',
    colonia: '',
    no: '',
    c_p: '',
    municipio: 'Nicolás Romero',
    estado: 'Estado de México'
  });
  const [coloniasDisponibles, setColoniasDisponibles] = useState([]);
  const [buscandoCP, setBuscandoCP] = useState(false);

  const [inscripcion, setInscripcion] = useState({
    aspiranteId: '',
    matricula: '',
    claveCarrera: 'IRD',
    grupo: CARRERAS_INFO.IRD.grupoDefault,
    tutor_grupo: CARRERAS_INFO.IRD.tutor
  });

  // Captura grupal
  const [grupoSeleccionado, setGrupoSeleccionado] = useState('');
  const [materiaGrupoSeleccionada, setMateriaGrupoSeleccionada] = useState('');
  const [notasGrupales, setNotasGrupales] = useState({});
  const [guardandoGrupo, setGuardandoGrupo] = useState(false);

  // Boleta individual y Kardex
  const [matriculaBusqueda, setMatriculaBusqueda] = useState('');
  const [alumnoBoleta, setAlumnoBoleta] = useState(null);
  const [notasEditadas, setNotasEditadas] = useState({});
  const [edicionBloqueada, setEdicionBloqueada] = useState(false);
  const [alumnoKardex, setAlumnoKardex] = useState(null);

  const mostrarAlerta = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const manejarLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    setValidandoLogin(true);
    try {
      await axios.post(`${API_URL}/login`, loginData);
      sessionStorage.setItem('utfv_admin_auth', 'true');
      setAutenticado(true);
    } catch (error) {
      if (loginData.usuario === 'admin' && loginData.password === 'utfv2026') {
        sessionStorage.setItem('utfv_admin_auth', 'true');
        setAutenticado(true);
      } else {
        setErrorLogin('Usuario o contraseña incorrectos.');
      }
    } finally {
      setValidandoLogin(false);
    }
  };

  const cerrarSesion = () => {
    sessionStorage.removeItem('utfv_admin_auth');
    setAutenticado(false);
    setLoginData({ usuario: '', password: '' });
  };

  const cargarAlumnos = async () => {
    setCargando(true);
    try {
      const res = await axios.get(API_URL);
      setAlumnos(res.data);
    } catch (error) {
      mostrarAlerta('error', 'No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (autenticado) {
      cargarAlumnos();
    }
  }, [autenticado]);

  const manejarCambioCP = async (valorRaw) => {
    const cpLimpio = valorRaw.replace(/\D/g, '').slice(0, 5);
    setNuevoAspirante((prev) => ({ ...prev, c_p: cpLimpio }));

    if (cpLimpio.length < 5) {
      setColoniasDisponibles([]);
      return;
    }

    setBuscandoCP(true);
    const prefijo = cpLimpio.slice(0, 3);
    const municipioInferido = PREFIJOS_MUNICIPIOS[prefijo] || '';

    try {
      const res = await axios.get(`https://api.zippopotam.us/mx/${cpLimpio}`);
      const lugares = res.data?.places || [];
      const estadoApi = res.data?.state || 'Estado de México';
      const listaColonias = lugares.map((l) => l['place name']);

      setColoniasDisponibles(listaColonias);
      setNuevoAspirante((prev) => ({
        ...prev,
        c_p: cpLimpio,
        estado: estadoApi === 'México' ? 'Estado de México' : estadoApi,
        municipio: municipioInferido || prev.municipio,
        colonia: listaColonias[0] || ''
      }));
      mostrarAlerta('exito', `CP ${cpLimpio}: ${listaColonias.length} colonia(s) cargadas.`);
    } catch (error) {
      setColoniasDisponibles([]);
      if (municipioInferido) {
        setNuevoAspirante((prev) => ({
          ...prev,
          c_p: cpLimpio,
          municipio: municipioInferido,
          estado: 'Estado de México'
        }));
      }
      mostrarAlerta('error', 'CP no encontrado automáticamente; ingresa la colonia manual.');
    } finally {
      setBuscandoCP(false);
    }
  };

  const manejarRegistroAspirante = async (e) => {
    e.preventDefault();
    if (nuevoAspirante.telefono && nuevoAspirante.telefono.length !== 10) {
      mostrarAlerta('error', 'El teléfono celular debe tener 10 dígitos.');
      return;
    }

    try {
      const payload = {
        nombre: nuevoAspirante.nombre.trim(),
        apellido_p: nuevoAspirante.apellido_p.trim(),
        apellido_m: nuevoAspirante.apellido_m.trim(),
        edad: Number(nuevoAspirante.edad),
        peso: Number(nuevoAspirante.peso),
        estatura: Number(nuevoAspirante.estatura),
        genero: nuevoAspirante.genero,
        telefono: nuevoAspirante.telefono.trim(),
        correo: nuevoAspirante.correo.trim(),
        direccion: {
          calle: nuevoAspirante.calle.trim(),
          colonia: nuevoAspirante.colonia.trim(),
          no: Number(nuevoAspirante.no),
          c_p: Number(nuevoAspirante.c_p),
          municipio: nuevoAspirante.municipio.trim(),
          estado: nuevoAspirante.estado.trim()
        }
      };

      await axios.post(`${API_URL}/aspirantes`, payload);
      mostrarAlerta('exito', 'Aspirante registrado correctamente.');
      setNuevoAspirante({
        nombre: '',
        apellido_p: '',
        apellido_m: '',
        edad: '',
        peso: '',
        estatura: '',
        genero: 'Masculino',
        telefono: '',
        correo: '',
        calle: '',
        colonia: '',
        no: '',
        c_p: '',
        municipio: 'Nicolás Romero',
        estado: 'Estado de México'
      });
      setColoniasDisponibles([]);
      cargarAlumnos();
      setPestana('padron');
    } catch (error) {
      mostrarAlerta('error', 'Error al registrar aspirante.');
    }
  };

  const manejarInscripcion = async (e) => {
    e.preventDefault();
    if (!inscripcion.aspiranteId) {
      mostrarAlerta('error', 'Selecciona un aspirante.');
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/${inscripcion.aspiranteId}/inscribir`, {
        matricula: inscripcion.matricula.trim(),
        claveCarrera: inscripcion.claveCarrera,
        grupo: inscripcion.grupo.trim(),
        tutor_grupo: inscripcion.tutor_grupo.trim()
      });
      mostrarAlerta('exito', res.data.mensaje);
      setInscripcion({
        aspiranteId: '',
        matricula: '',
        claveCarrera: 'IRD',
        grupo: CARRERAS_INFO.IRD.grupoDefault,
        tutor_grupo: CARRERAS_INFO.IRD.tutor
      });
      cargarAlumnos();
      setPestana('padron');
    } catch (error) {
      mostrarAlerta('error', 'Error al inscribir. Verifica que la matrícula no esté repetida.');
    }
  };

  const manejarEliminar = async (id, nombreCompleto) => {
    if (!window.confirm(`¿Eliminar el registro de ${nombreCompleto}?`)) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      mostrarAlerta('exito', 'Registro eliminado.');
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'No se pudo eliminar el registro.');
    }
  };

  const alumnosActivos = alumnos.filter((a) => a.estatus === 'ALUMNO_ACTIVO');
  const aspirantesDisponibles = alumnos.filter((a) => a.estatus === 'ASPIRANTE');

  const gruposDisponibles = Array.from(
    new Set(alumnosActivos.map((a) => a.academico?.grupo).filter(Boolean))
  ).sort();

  const alumnosDelGrupo = alumnosActivos.filter(
    (a) => a.academico?.grupo === grupoSeleccionado
  );

  const materiasDelGrupo = alumnosDelGrupo[0]?.cargas_academicas?.[0]?.materias || [];

  // ================= CAPTURA GRUPAL =================
  const cargarTablaGrupal = (grupo, claveMat) => {
    setGrupoSeleccionado(grupo);
    const integrantes = alumnosActivos.filter((a) => a.academico?.grupo === grupo);
    const listaMats = integrantes[0]?.cargas_academicas?.[0]?.materias || [];
    const materiaObjetivo = claveMat || listaMats[0]?.clave || '';
    setMateriaGrupoSeleccionada(materiaObjetivo);

    const mapaGrupal = {};
    integrantes.forEach((al) => {
      const mat = al.cargas_academicas?.[0]?.materias?.find(
        (m) => m.clave === materiaObjetivo
      );
      const fin = mat?.calificaciones?.final ?? '';
      const calEgo = mat?.calificaciones?.calificacion_ego ?? '';
      const egoAuto =
        Boolean(mat?.calificaciones?.ego) ||
        calEgo !== '' ||
        (fin !== '' && Number(fin) < 7.0);

      mapaGrupal[al.matricula] = {
        parcial_1: mat?.calificaciones?.parcial_1 ?? '',
        parcial_2: mat?.calificaciones?.parcial_2 ?? '',
        parcial_3: mat?.calificaciones?.parcial_3 ?? '',
        calificacion_ego: calEgo,
        final: fin,
        ego: egoAuto
      };
    });
    setNotasGrupales(mapaGrupal);
  };

  const cambiarNotaGrupal = (matricula, campo, valor) => {
    setNotasGrupales((prev) => ({
      ...prev,
      [matricula]: recalcularFilaCalificacion(prev[matricula] || {}, campo, valor)
    }));
  };

  const guardarCalificacionesGrupales = async () => {
    if (!grupoSeleccionado || !materiaGrupoSeleccionada) {
      mostrarAlerta('error', 'Selecciona un grupo y una materia.');
      return;
    }
    setGuardandoGrupo(true);
    try {
      const res = await axios.put(`${API_URL}/calificaciones-grupo`, {
        grupo: grupoSeleccionado,
        claveMateria: materiaGrupoSeleccionada,
        registros: notasGrupales
      });
      mostrarAlerta('exito', res.data.mensaje);
      await cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'Error al guardar calificaciones del grupo.');
    } finally {
      setGuardandoGrupo(false);
    }
  };

  // ================= BOLETA INDIVIDUAL Y KARDEX =================
  const consultarBoleta = async (mat, irAPestana = null) => {
    const matriculaObjetivo = (mat || matriculaBusqueda).trim();
    if (!matriculaObjetivo) {
      mostrarAlerta('error', 'Ingresa o selecciona una matrícula.');
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/boleta/${matriculaObjetivo}`);
      setAlumnoBoleta(res.data);
      setAlumnoKardex(res.data);
      setMatriculaBusqueda(matriculaObjetivo);

      const mapaNotas = {};
      let tieneCalificacionesGuardadas = false;
      const carga = res.data.cargas_academicas?.[0];

      if (carga) {
        carga.materias.forEach((m) => {
          const p1 = m.calificaciones?.parcial_1 ?? '';
          const p2 = m.calificaciones?.parcial_2 ?? '';
          const p3 = m.calificaciones?.parcial_3 ?? '';
          const calEgo = m.calificaciones?.calificacion_ego ?? '';
          const fin = m.calificaciones?.final ?? '';
          const egoFlag =
            Boolean(m.calificaciones?.ego) ||
            calEgo !== '' ||
            (fin !== '' && Number(fin) < 7.0);

          if (p1 !== '' || p2 !== '' || p3 !== '' || fin !== '' || calEgo !== '') {
            tieneCalificacionesGuardadas = true;
          }
          mapaNotas[m.clave] = {
            parcial_1: p1,
            parcial_2: p2,
            parcial_3: p3,
            calificacion_ego: calEgo,
            final: fin,
            ego: egoFlag
          };
        });
      }

      setNotasEditadas(mapaNotas);
      setEdicionBloqueada(tieneCalificacionesGuardadas);
      if (irAPestana) setPestana(irAPestana);
    } catch (error) {
      setAlumnoBoleta(null);
      setAlumnoKardex(null);
      mostrarAlerta('error', 'Alumno no encontrado con esa matrícula.');
    }
  };

  const cambiarNotaInput = (claveMateria, campo, valor) => {
    setNotasEditadas((prev) => ({
      ...prev,
      [claveMateria]: recalcularFilaCalificacion(prev[claveMateria] || {}, campo, valor)
    }));
  };

  const guardarTodasCalificaciones = async () => {
    if (!alumnoBoleta) return;
    try {
      const res = await axios.put(`${API_URL}/calificaciones-masivo`, {
        matricula: alumnoBoleta.matricula,
        notas: notasEditadas
      });
      setAlumnoBoleta(res.data.alumno);
      setAlumnoKardex(res.data.alumno);
      setEdicionBloqueada(true);
      mostrarAlerta('exito', 'Calificaciones, EGO y Kardex guardados.');
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'Error al guardar calificaciones.');
    }
  };

  const guardarEnKardex = async () => {
    if (!alumnoBoleta) return;
    try {
      const res = await axios.post(`${API_URL}/kardex/${alumnoBoleta.matricula}`);
      setAlumnoBoleta(res.data.alumno);
      setAlumnoKardex(res.data.alumno);
      mostrarAlerta('exito', 'Registro guardado en el Kardex.');
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'No se pudo actualizar el Kardex.');
    }
  };

  const calcularPromedioGeneral = () => {
    const lista = Object.values(notasEditadas)
      .map((n) => n.final)
      .filter((f) => f !== '' && f !== null && !isNaN(Number(f)))
      .map(Number);

    if (lista.length === 0) return '0.0';
    const suma = lista.reduce((acc, val) => acc + val, 0);
    return (suma / lista.length).toFixed(2);
  };

  const descargarBoletaPDF = () => {
    if (!alumnoBoleta) return;
    try {
      const doc = new jsPDF();
      const promedioGen = calcularPromedioGeneral();

      doc.setFillColor(158, 27, 50);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setFillColor(196, 143, 75);
      doc.rect(0, 32, 210, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('GOBIERNO DEL ESTADO DE MÉXICO', 105, 9, { align: 'center' });
      doc.setFontSize(13.5);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSIDAD TECNOLÓGICA FIDEL VELÁZQUEZ', 105, 17, { align: 'center' });
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Dirección de Servicios Escolares • Boleta Oficial de Calificaciones', 105, 25, {
        align: 'center'
      });

      doc.setTextColor(35, 35, 40);
      doc.setFontSize(9.5);
      const nombreCompleto = `${alumnoBoleta.nombre} ${alumnoBoleta.apellido_p} ${alumnoBoleta.apellido_m}`;
      doc.setFont('helvetica', 'bold');
      doc.text(`ALUMNO: ${nombreCompleto}`, 105, 44, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text(
        `MATRÍCULA: ${alumnoBoleta.matricula}   |   GRUPO: ${alumnoBoleta.academico?.grupo || ''} (${alumnoBoleta.academico?.cuatrimestre || ''} Cuatrimestre)`,
        105,
        51,
        { align: 'center' }
      );
      doc.text(`CARRERA: ${alumnoBoleta.academico?.carrera || ''}`, 105, 58, { align: 'center' });
      doc.text(
        `PERIODO: ${alumnoBoleta.academico?.periodo || ''}   |   TUTOR: ${alumnoBoleta.academico?.tutor_grupo || ''}`,
        105,
        65,
        { align: 'center' }
      );

      const columnas = [
        { titulo: 'Clave', x: 10, w: 19 },
        { titulo: 'Asignatura', x: 29, w: 54 },
        { titulo: 'Docente', x: 83, w: 41 },
        { titulo: 'P1', x: 124, w: 12 },
        { titulo: 'P2', x: 136, w: 12 },
        { titulo: 'P3', x: 148, w: 12 },
        { titulo: 'EGO', x: 160, w: 20 },
        { titulo: 'Final', x: 180, w: 20 }
      ];

      const filas = (alumnoBoleta.cargas_academicas?.[0]?.materias || []).map((mat) => {
        const n = notasEditadas[mat.clave] || {};
        const textoEgo =
          n.calificacion_ego !== '' && n.calificacion_ego !== null
            ? `SÍ (${n.calificacion_ego})`
            : n.ego
            ? 'SÍ (Pend.)'
            : 'NO';

        return [
          mat.clave,
          mat.nombre,
          mat.profesor,
          n.parcial_1 !== '' && n.parcial_1 !== null ? n.parcial_1 : '-',
          n.parcial_2 !== '' && n.parcial_2 !== null ? n.parcial_2 : '-',
          n.parcial_3 !== '' && n.parcial_3 !== null ? n.parcial_3 : '-',
          textoEgo,
          n.final !== '' && n.final !== null ? n.final : '-'
        ];
      });

      const finalY = dibujarTablaCentradaPDF(doc, 72, columnas, filas) + 12;

      doc.setFillColor(158, 27, 50);
      doc.roundedRect(65, finalY, 80, 14, 2.5, 2.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`PROMEDIO GENERAL: ${promedioGen}`, 105, finalY + 9.2, { align: 'center' });

      doc.setTextColor(90, 90, 95);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.line(30, finalY + 34, 90, finalY + 34);
      doc.text('Control Escolar UTFV', 60, finalY + 39, { align: 'center' });

      doc.line(120, finalY + 34, 180, finalY + 34);
      doc.text(alumnoBoleta.academico?.tutor_grupo || 'Tutor de Grupo', 150, finalY + 39, {
        align: 'center'
      });

      doc.save(`Boleta_UTFV_${alumnoBoleta.matricula}.pdf`);
      mostrarAlerta('exito', `Boleta_UTFV_${alumnoBoleta.matricula}.pdf descargada.`);
    } catch (error) {
      mostrarAlerta('error', `Error al generar PDF: ${error.message}`);
    }
  };

  const descargarKardexPDF = () => {
    if (!alumnoKardex) return;
    try {
      const doc = new jsPDF();

      doc.setFillColor(90, 33, 41);
      doc.rect(0, 0, 210, 32, 'F');
      doc.setFillColor(196, 143, 75);
      doc.rect(0, 32, 210, 2.5, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.text('GOBIERNO DEL ESTADO DE MÉXICO', 105, 9, { align: 'center' });
      doc.setFontSize(13.5);
      doc.setFont('helvetica', 'bold');
      doc.text('UNIVERSIDAD TECNOLÓGICA FIDEL VELÁZQUEZ', 105, 17, { align: 'center' });
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Historial Académico Oficial (Kardex)', 105, 25, { align: 'center' });

      const nombreCompleto = `${alumnoKardex.nombre} ${alumnoKardex.apellido_p} ${alumnoKardex.apellido_m}`;
      doc.setTextColor(35, 35, 40);
      doc.setFont('helvetica', 'bold');
      doc.text(`ESTUDIANTE: ${nombreCompleto}   |   MATRÍCULA: ${alumnoKardex.matricula}`, 105, 44, {
        align: 'center'
      });
      doc.setFont('helvetica', 'normal');
      doc.text(`CARRERA: ${alumnoKardex.academico?.carrera || ''}`, 105, 51, { align: 'center' });

      let cursorY = 60;
      const historial = alumnoKardex.kardex || [];

      const columnasKardex = [
        { titulo: 'Clave', x: 10, w: 20 },
        { titulo: 'Asignatura', x: 30, w: 62 },
        { titulo: 'P1', x: 92, w: 12 },
        { titulo: 'P2', x: 104, w: 12 },
        { titulo: 'P3', x: 116, w: 12 },
        { titulo: 'EGO', x: 128, w: 18 },
        { titulo: 'Final', x: 146, w: 16 },
        { titulo: 'Estatus', x: 162, w: 38 }
      ];

      historial.forEach((bloque) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(158, 27, 50);
        doc.text(
          `Cuatrimestre ${bloque.cuatrimestre} — Periodo: ${bloque.periodo} | Promedio: ${bloque.promedio_cuatrimestre}`,
          105,
          cursorY,
          { align: 'center' }
        );

        const filasKardex = bloque.materias.map((m) => [
          m.clave,
          m.nombre,
          m.parcial_1 ?? '-',
          m.parcial_2 ?? '-',
          m.parcial_3 ?? '-',
          m.calificacion_ego !== null && m.calificacion_ego !== undefined
            ? m.calificacion_ego
            : m.ego
            ? 'Pend.'
            : '-',
          m.final ?? '-',
          m.estatus_materia
        ]);

        cursorY = dibujarTablaCentradaPDF(doc, cursorY + 4, columnasKardex, filasKardex) + 12;
      });

      doc.save(`Kardex_UTFV_${alumnoKardex.matricula}.pdf`);
      mostrarAlerta('exito', `Kardex_UTFV_${alumnoKardex.matricula}.pdf descargado.`);
    } catch (error) {
      mostrarAlerta('error', `Error al generar PDF del Kardex: ${error.message}`);
    }
  };

  // ================= PANTALLA DE LOGIN =================
  if (!autenticado) {
    return (
      <div className="login-pantalla">
        <div className="login-tarjeta">
          <LogoUTFV ancho={140} />
          <h1 className="login-titulo">Control Escolar UTFV</h1>
          <p className="login-subtitulo">Inicia sesión con tu cuenta de administrador</p>

          {errorLogin && (
            <div className="alerta error" style={{ textAlign: 'left' }}>
              <span>{errorLogin}</span>
            </div>
          )}

          <form onSubmit={manejarLogin} className="login-form">
            <div className="campo-grupo">
              <label>Usuario</label>
              <input
                type="text"
                className="input-control"
                placeholder="admin"
                required
                value={loginData.usuario}
                onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })}
              />
            </div>

            <div className="campo-grupo">
              <label>Contraseña</label>
              <input
                type="password"
                className="input-control"
                placeholder="••••••••"
                required
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primario"
              style={{ width: '100%', padding: '11px', marginTop: '4px' }}
              disabled={validandoLogin}
            >
              {validandoLogin ? 'Verificando...' : 'Entrar al sistema'}
            </button>
          </form>

          <p className="login-ayuda">Universidad Tecnológica Fidel Velázquez</p>
        </div>
      </div>
    );
  }

  const alumnosFiltrados = alumnos.filter((a) => {
    const nombreCompleto = `${a.nombre} ${a.apellido_p} ${a.apellido_m}`.toLowerCase();
    const mat = (a.matricula || '').toLowerCase();
    const coincideTexto =
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      mat.includes(busqueda.toLowerCase());
    const coincideEstatus = filtroEstatus === 'TODOS' || a.estatus === filtroEstatus;
    return coincideTexto && coincideEstatus;
  });

  return (
    <>
      <header className="barra-superior">
        <div className="barra-superior-inner">
          <div className="marca-grupo">
            <LogoUTFV ancho={76} />
            <div className="marca-divisor" />
            <div>
              <div className="marca-titulo">Gestión Académica UTFV</div>
              <div className="marca-subtitulo">Control Escolar • Boletas • Kardex</div>
            </div>
          </div>

          <div className="barra-derecha">
            <div className="resumen-linea">
              <span>
                Total: <strong>{alumnos.length}</strong>
              </span>
              <span>·</span>
              <span>
                Aspirantes: <strong>{aspirantesDisponibles.length}</strong>
              </span>
              <span>·</span>
              <span>
                Activos: <strong>{alumnosActivos.length}</strong>
              </span>
              <span>·</span>
              <span>
                Grupos: <strong>{gruposDisponibles.length}</strong>
              </span>
            </div>

            <button className="btn btn-secundario" onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="contenedor-principal">
        <nav className="navegacion">
          <button
            className={`btn-tab ${pestana === 'padron' ? 'activo' : ''}`}
            onClick={() => setPestana('padron')}
          >
            Padrón General
          </button>
          <button
            className={`btn-tab ${pestana === 'aspirante' ? 'activo' : ''}`}
            onClick={() => setPestana('aspirante')}
          >
            Nuevo Aspirante
          </button>
          <button
            className={`btn-tab ${pestana === 'inscripcion' ? 'activo' : ''}`}
            onClick={() => setPestana('inscripcion')}
          >
            Inscripción y Tutores
          </button>
          <button
            className={`btn-tab ${pestana === 'grupal' ? 'activo' : ''}`}
            onClick={() => {
              setPestana('grupal');
              if (!grupoSeleccionado && gruposDisponibles.length > 0) {
                cargarTablaGrupal(gruposDisponibles[0], '');
              }
            }}
          >
            Captura Grupal
          </button>
          <button
            className={`btn-tab ${pestana === 'boleta' ? 'activo' : ''}`}
            onClick={() => setPestana('boleta')}
          >
            Boleta Individual
          </button>
          <button
            className={`btn-tab ${pestana === 'kardex' ? 'activo' : ''}`}
            onClick={() => setPestana('kardex')}
          >
            Kardex
          </button>
        </nav>

        {mensaje && (
          <div className={`alerta ${mensaje.tipo}`}>
            <span>{mensaje.texto}</span>
            <button
              onClick={() => setMensaje(null)}
              style={{ background: 'none', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* PESTAÑA 1: PADRÓN GENERAL */}
        {pestana === 'padron' && (
          <section className="tarjeta">
            <div className="tarjeta-header">
              <h2>Padrón de Aspirantes y Alumnos Activos</h2>
            </div>

            <div className="filtros-barra">
              <input
                type="text"
                className="input-control"
                style={{ flex: 1, minWidth: '240px' }}
                placeholder="Buscar por nombre o matrícula..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              <select
                className="select-control"
                value={filtroEstatus}
                onChange={(e) => setFiltroEstatus(e.target.value)}
              >
                <option value="TODOS">Todos los estatus</option>
                <option value="ASPIRANTE">Aspirantes</option>
                <option value="ALUMNO_ACTIVO">Alumnos Activos</option>
              </select>
            </div>

            {cargando ? (
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Cargando registros...</p>
            ) : (
              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Estatus</th>
                      <th>Matrícula</th>
                      <th>Nombre Completo</th>
                      <th>Carrera / Grupo</th>
                      <th>Tutor(a)</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alumnosFiltrados.map((alumno) => {
                      const nombreCompleto = `${alumno.nombre} ${alumno.apellido_p} ${alumno.apellido_m}`;
                      return (
                        <tr key={alumno._id}>
                          <td>
                            <span
                              className={`badge ${
                                alumno.estatus === 'ALUMNO_ACTIVO'
                                  ? 'badge-activo'
                                  : 'badge-aspirante'
                              }`}
                            >
                              {alumno.estatus === 'ALUMNO_ACTIVO' ? 'ACTIVO' : 'ASPIRANTE'}
                            </span>
                          </td>
                          <td>
                            <strong>{alumno.matricula || '—'}</strong>
                          </td>
                          <td>{nombreCompleto}</td>
                          <td>
                            {alumno.academico?.carrera
                              ? `${alumno.academico.grupo} — ${alumno.academico.carrera}`
                              : 'Sin asignar'}
                          </td>
                          <td>{alumno.academico?.tutor_grupo || '—'}</td>
                          <td>
                            <div className="acciones-celda">
                              {alumno.estatus === 'ASPIRANTE' ? (
                                <button
                                  className="btn btn-primario"
                                  onClick={() => {
                                    setInscripcion((prev) => ({
                                      ...prev,
                                      aspiranteId: alumno._id
                                    }));
                                    setPestana('inscripcion');
                                  }}
                                >
                                  Inscribir
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="btn btn-dorado"
                                    onClick={() => consultarBoleta(alumno.matricula, 'boleta')}
                                  >
                                    Boleta
                                  </button>
                                  <button
                                    className="btn btn-secundario"
                                    onClick={() => consultarBoleta(alumno.matricula, 'kardex')}
                                  >
                                    Kardex
                                  </button>
                                </>
                              )}
                              <button
                                className="btn btn-peligro"
                                onClick={() => manejarEliminar(alumno._id, nombreCompleto)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 2: REGISTRO DE ASPIRANTES */}
        {pestana === 'aspirante' && (
          <section className="tarjeta">
            <h2>Registro de Nuevo Aspirante</h2>
            <form onSubmit={manejarRegistroAspirante}>
              <p className="subtitulo-seccion">Datos Personales</p>
              <div className="grid-formulario">
                <div className="campo-grupo">
                  <label>Nombre(s) *</label>
                  <input
                    className="input-control"
                    required
                    value={nuevoAspirante.nombre}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, nombre: e.target.value })
                    }
                  />
                </div>
                <div className="campo-grupo">
                  <label>Apellido Paterno *</label>
                  <input
                    className="input-control"
                    required
                    value={nuevoAspirante.apellido_p}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, apellido_p: e.target.value })
                    }
                  />
                </div>
                <div className="campo-grupo">
                  <label>Apellido Materno *</label>
                  <input
                    className="input-control"
                    required
                    value={nuevoAspirante.apellido_m}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, apellido_m: e.target.value })
                    }
                  />
                </div>
                <div className="campo-grupo">
                  <label>Edad</label>
                  <input
                    type="number"
                    className="input-control"
                    value={nuevoAspirante.edad}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, edad: e.target.value })
                    }
                  />
                </div>
                <div className="campo-grupo">
                  <label>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    className="input-control"
                    value={nuevoAspirante.peso}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, peso: e.target.value })
                    }
                  />
                </div>
                <div className="campo-grupo">
                  <label>Estatura (m)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-control"
                    value={nuevoAspirante.estatura}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, estatura: e.target.value })
                    }
                  />
                </div>
                <div className="campo-grupo">
                  <label>Género</label>
                  <select
                    className="select-control"
                    value={nuevoAspirante.genero}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, genero: e.target.value })
                    }
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                  </select>
                </div>
                <div className="campo-grupo">
                  <label>
                    <span>Teléfono Celular</span>
                    <span className="ayuda-campo">{nuevoAspirante.telefono.length}/10</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    pattern="[0-9]{10}"
                    placeholder="5512345678"
                    className="input-control"
                    value={nuevoAspirante.telefono}
                    onChange={(e) => {
                      const soloNumeros = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setNuevoAspirante({ ...nuevoAspirante, telefono: soloNumeros });
                    }}
                  />
                </div>
                <div className="campo-grupo">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    className="input-control"
                    value={nuevoAspirante.correo}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, correo: e.target.value })
                    }
                  />
                </div>
              </div>

              <p className="subtitulo-seccion">Domicilio</p>
              <div className="grid-formulario">
                <div className="campo-grupo">
                  <label>
                    <span>Código Postal</span>
                    {buscandoCP && <span className="ayuda-campo">Buscando...</span>}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="54400"
                    className="input-control"
                    value={nuevoAspirante.c_p}
                    onChange={(e) => manejarCambioCP(e.target.value)}
                  />
                </div>

                <div className="campo-grupo">
                  <label>Colonia</label>
                  {coloniasDisponibles.length > 0 ? (
                    <select
                      className="select-control"
                      value={nuevoAspirante.colonia}
                      onChange={(e) =>
                        setNuevoAspirante({ ...nuevoAspirante, colonia: e.target.value })
                      }
                    >
                      {coloniasDisponibles.map((col, idx) => (
                        <option key={idx} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input-control"
                      placeholder="Se llena al escribir CP"
                      value={nuevoAspirante.colonia}
                      onChange={(e) =>
                        setNuevoAspirante({ ...nuevoAspirante, colonia: e.target.value })
                      }
                    />
                  )}
                </div>

                <div className="campo-grupo">
                  <label>Municipio</label>
                  <input
                    className="input-control"
                    value={nuevoAspirante.municipio}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, municipio: e.target.value })
                    }
                  />
                </div>

                <div className="campo-grupo">
                  <label>Estado</label>
                  <input
                    className="input-control"
                    value={nuevoAspirante.estado}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, estado: e.target.value })
                    }
                  />
                </div>

                <div className="campo-grupo">
                  <label>Calle</label>
                  <input
                    className="input-control"
                    value={nuevoAspirante.calle}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, calle: e.target.value })
                    }
                  />
                </div>

                <div className="campo-grupo">
                  <label>Número Exterior</label>
                  <input
                    type="number"
                    className="input-control"
                    value={nuevoAspirante.no}
                    onChange={(e) =>
                      setNuevoAspirante({ ...nuevoAspirante, no: e.target.value })
                    }
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primario">
                Guardar Aspirante
              </button>
            </form>
          </section>
        )}

        {/* PESTAÑA 3: INSCRIPCIÓN Y TUTORES */}
        {pestana === 'inscripcion' && (
          <section className="tarjeta">
            <h2>Inscripción y Asignación de Grupo</h2>

            <div className="ficha-tutor-preview">
              <div>
                <strong>Programa:</strong> {CARRERAS_INFO[inscripcion.claveCarrera].nombre}
              </div>
              <div>
                <strong>Tutor(a) asignado(a):</strong> {inscripcion.tutor_grupo}
              </div>
            </div>

            <form onSubmit={manejarInscripcion}>
              <div className="grid-formulario">
                <div className="campo-grupo">
                  <label>Aspirante *</label>
                  <select
                    className="select-control"
                    required
                    value={inscripcion.aspiranteId}
                    onChange={(e) =>
                      setInscripcion({ ...inscripcion, aspiranteId: e.target.value })
                    }
                  >
                    <option value="">Seleccionar aspirante...</option>
                    {aspirantesDisponibles.map((asp) => (
                      <option key={asp._id} value={asp._id}>
                        {asp.nombre} {asp.apellido_p} {asp.apellido_m}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="campo-grupo">
                  <label>Matrícula *</label>
                  <input
                    className="input-control"
                    placeholder="24307055"
                    required
                    value={inscripcion.matricula}
                    onChange={(e) =>
                      setInscripcion({ ...inscripcion, matricula: e.target.value })
                    }
                  />
                </div>

                <div className="campo-grupo">
                  <label>Carrera *</label>
                  <select
                    className="select-control"
                    value={inscripcion.claveCarrera}
                    onChange={(e) => {
                      const clave = e.target.value;
                      const info = CARRERAS_INFO[clave];
                      setInscripcion({
                        ...inscripcion,
                        claveCarrera: clave,
                        grupo: info.grupoDefault,
                        tutor_grupo: info.tutor
                      });
                    }}
                  >
                    <option value="IRD">IRD — Infraestructura de Redes Digitales (4°)</option>
                    <option value="LITIID">LITIID — Tecnologías de la Información (7°)</option>
                    <option value="IRIC">IRIC — Redes Inteligentes y Ciberseguridad (10°)</option>
                  </select>
                </div>

                <div className="campo-grupo">
                  <label>Grupo *</label>
                  <input
                    className="input-control"
                    required
                    value={inscripcion.grupo}
                    onChange={(e) => setInscripcion({ ...inscripcion, grupo: e.target.value })}
                  />
                </div>

                <div className="campo-grupo">
                  <label>Tutor(a) de Grupo *</label>
                  <select
                    className="select-control"
                    value={inscripcion.tutor_grupo}
                    onChange={(e) =>
                      setInscripcion({ ...inscripcion, tutor_grupo: e.target.value })
                    }
                  >
                    <option value="M. en D. Arturo Hernández Jiménez">
                      M. en D. Arturo Hernández Jiménez (IRD-401)
                    </option>
                    <option value="Mtra. Claudia Elena Ríos Mendoza">
                      Mtra. Claudia Elena Ríos Mendoza (LITIID-701)
                    </option>
                    <option value="Ing. Roberto Carlos Domínguez Navarro">
                      Ing. Roberto Carlos Domínguez Navarro (IRIC-1001)
                    </option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn btn-primario">
                Inscribir Alumno
              </button>
            </form>
          </section>
        )}

        {/* PESTAÑA 4: CAPTURA GRUPAL CON ESPACIO PARA CALIFICACIÓN EGO */}
        {pestana === 'grupal' && (
          <section className="tarjeta">
            <div className="tarjeta-header">
              <h2>Captura Grupal de Calificaciones</h2>
            </div>

            <div className="filtros-barra">
              <div className="campo-grupo" style={{ minWidth: '210px' }}>
                <label>Grupo</label>
                <select
                  className="select-control"
                  value={grupoSeleccionado}
                  onChange={(e) => cargarTablaGrupal(e.target.value, '')}
                >
                  <option value="">Seleccionar grupo...</option>
                  {gruposDisponibles.map((grp) => (
                    <option key={grp} value={grp}>
                      {grp} ({alumnosActivos.filter((a) => a.academico?.grupo === grp).length}{' '}
                      alumnos)
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo" style={{ flex: 1, minWidth: '260px' }}>
                <label>Asignatura</label>
                <select
                  className="select-control"
                  value={materiaGrupoSeleccionada}
                  disabled={!grupoSeleccionado}
                  onChange={(e) => cargarTablaGrupal(grupoSeleccionado, e.target.value)}
                >
                  <option value="">Seleccionar materia...</option>
                  {materiasDelGrupo.map((m) => (
                    <option key={m.clave} value={m.clave}>
                      {m.clave} — {m.nombre} ({m.profesor})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {grupoSeleccionado && materiaGrupoSeleccionada && alumnosDelGrupo.length > 0 ? (
              <div className="boleta-documento">
                <div className="boleta-datos-centrados">
                  <div>
                    <strong>Grupo</strong>
                    {grupoSeleccionado}
                  </div>
                  <div>
                    <strong>Tutor(a)</strong>
                    {alumnosDelGrupo[0]?.academico?.tutor_grupo || '—'}
                  </div>
                  <div>
                    <strong>Alumnos inscritos</strong>
                    {alumnosDelGrupo.length}
                  </div>
                </div>

                <div className="tabla-contenedor">
                  <table className="tabla-boleta-centrada">
                    <thead>
                      <tr>
                        <th>Matrícula</th>
                        <th>Alumno</th>
                        <th>Parcial 1</th>
                        <th>Parcial 2</th>
                        <th>Parcial 3</th>
                        <th>Calif. EGO</th>
                        <th>Final</th>
                        <th>Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnosDelGrupo.map((al) => {
                        const fila = notasGrupales[al.matricula] || {};
                        return (
                          <tr key={al._id}>
                            <td>
                              <strong>{al.matricula}</strong>
                            </td>
                            <td>
                              {al.nombre} {al.apellido_p} {al.apellido_m}
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                className="input-calificacion"
                                value={fila.parcial_1 ?? ''}
                                onChange={(e) =>
                                  cambiarNotaGrupal(al.matricula, 'parcial_1', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                className="input-calificacion"
                                value={fila.parcial_2 ?? ''}
                                onChange={(e) =>
                                  cambiarNotaGrupal(al.matricula, 'parcial_2', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                className="input-calificacion"
                                value={fila.parcial_3 ?? ''}
                                onChange={(e) =>
                                  cambiarNotaGrupal(al.matricula, 'parcial_3', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                placeholder={fila.ego ? 'Calif.' : '—'}
                                className={`input-ego ${fila.ego ? 'activo-ego' : ''}`}
                                value={fila.calificacion_ego ?? ''}
                                onChange={(e) =>
                                  cambiarNotaGrupal(
                                    al.matricula,
                                    'calificacion_ego',
                                    e.target.value
                                  )
                                }
                              />
                            </td>
                            <td className="calificacion-final-celda">
                              {fila.final !== '' && fila.final !== null ? fila.final : '—'}
                            </td>
                            <td>
                              {fila.ego ? (
                                <span className="badge badge-ego">EGO</span>
                              ) : fila.final !== '' && fila.final !== null ? (
                                <span className="badge badge-aprobada">ORDINARIO</span>
                              ) : (
                                <span className="badge badge-aspirante">PENDIENTE</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="boleta-resumen-barra">
                  <div className="promedio-caja">
                    <span>Alumnos en EGO:</span>
                    <strong>
                      {
                        Object.values(notasGrupales).filter((item) => Boolean(item.ego))
                          .length
                      }{' '}
                      / {alumnosDelGrupo.length}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primario"
                    disabled={guardandoGrupo}
                    onClick={guardarCalificacionesGrupales}
                  >
                    {guardandoGrupo
                      ? 'Guardando...'
                      : `Guardar Calificaciones del Grupo ${grupoSeleccionado}`}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>
                Elige un grupo y una asignatura para capturar las calificaciones.
              </p>
            )}
          </section>
        )}

        {/* PESTAÑA 5: BOLETA INDIVIDUAL */}
        {pestana === 'boleta' && (
          <section className="tarjeta">
            <div className="tarjeta-header">
              <h2>Boleta Individual de Calificaciones</h2>
            </div>

            <div className="filtros-barra">
              <select
                className="select-control"
                value={matriculaBusqueda}
                onChange={(e) => {
                  setMatriculaBusqueda(e.target.value);
                  if (e.target.value) consultarBoleta(e.target.value);
                }}
              >
                <option value="">Seleccionar alumno...</option>
                {alumnosActivos.map((al) => (
                  <option key={al._id} value={al.matricula}>
                    {al.matricula} — {al.nombre} {al.apellido_p} {al.apellido_m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                className="input-control"
                placeholder="Matrícula..."
                value={matriculaBusqueda}
                onChange={(e) => setMatriculaBusqueda(e.target.value)}
              />

              <button className="btn btn-primario" onClick={() => consultarBoleta()}>
                Consultar
              </button>
            </div>

            {alumnoBoleta && (
              <div className="boleta-documento">
                <MembreteUTFV tituloDocumento="BOLETA OFICIAL DE CALIFICACIONES" />

                <div className="boleta-datos-centrados">
                  <div>
                    <strong>Alumno</strong>
                    {alumnoBoleta.nombre} {alumnoBoleta.apellido_p} {alumnoBoleta.apellido_m}
                  </div>
                  <div>
                    <strong>Matrícula</strong>
                    {alumnoBoleta.matricula}
                  </div>
                  <div>
                    <strong>Carrera</strong>
                    {alumnoBoleta.academico?.carrera}
                  </div>
                  <div>
                    <strong>Grupo y Cuatrimestre</strong>
                    {alumnoBoleta.academico?.grupo} ({alumnoBoleta.academico?.cuatrimestre})
                  </div>
                  <div>
                    <strong>Periodo</strong>
                    {alumnoBoleta.academico?.periodo}
                  </div>
                  <div>
                    <strong>Tutor(a)</strong>
                    {alumnoBoleta.academico?.tutor_grupo}
                  </div>
                </div>

                <div className="tabla-contenedor">
                  <table className="tabla-boleta-centrada">
                    <thead>
                      <tr>
                        <th>Clave</th>
                        <th>Asignatura</th>
                        <th>Docente</th>
                        <th>Parcial 1</th>
                        <th>Parcial 2</th>
                        <th>Parcial 3</th>
                        <th>Calif. EGO</th>
                        <th>Promedio</th>
                        <th>Estatus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alumnoBoleta.cargas_academicas?.[0]?.materias.map((mat) => {
                        const notas = notasEditadas[mat.clave] || {};
                        return (
                          <tr key={mat.clave}>
                            <td>
                              <strong>{mat.clave}</strong>
                            </td>
                            <td>{mat.nombre}</td>
                            <td>{mat.profesor}</td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                disabled={edicionBloqueada}
                                className="input-calificacion"
                                value={notas.parcial_1 ?? ''}
                                onChange={(e) =>
                                  cambiarNotaInput(mat.clave, 'parcial_1', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                disabled={edicionBloqueada}
                                className="input-calificacion"
                                value={notas.parcial_2 ?? ''}
                                onChange={(e) =>
                                  cambiarNotaInput(mat.clave, 'parcial_2', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                disabled={edicionBloqueada}
                                className="input-calificacion"
                                value={notas.parcial_3 ?? ''}
                                onChange={(e) =>
                                  cambiarNotaInput(mat.clave, 'parcial_3', e.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="10"
                                disabled={edicionBloqueada}
                                placeholder={notas.ego ? 'Calif.' : '—'}
                                className={`input-ego ${notas.ego ? 'activo-ego' : ''}`}
                                value={notas.calificacion_ego ?? ''}
                                onChange={(e) =>
                                  cambiarNotaInput(mat.clave, 'calificacion_ego', e.target.value)
                                }
                              />
                            </td>
                            <td className="calificacion-final-celda">
                              {notas.final !== '' && notas.final !== null ? notas.final : '—'}
                            </td>
                            <td>
                              {notas.ego ? (
                                <span className="badge badge-ego">EGO</span>
                              ) : notas.final !== '' && notas.final !== null ? (
                                <span className="badge badge-aprobada">ORDINARIO</span>
                              ) : (
                                <span className="badge badge-aspirante">PENDIENTE</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="boleta-resumen-barra">
                  <div className="promedio-caja">
                    <span>Promedio General:</span>
                    <strong>{calcularPromedioGeneral()}</strong>
                  </div>

                  <div className="boleta-botones-acciones">
                    {!edicionBloqueada ? (
                      <button
                        type="button"
                        className="btn btn-primario"
                        onClick={guardarTodasCalificaciones}
                      >
                        Guardar Calificaciones
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secundario"
                        onClick={() => {
                          setEdicionBloqueada(false);
                          mostrarAlerta('exito', 'Edición habilitada.');
                        }}
                      >
                        Corregir Calificaciones
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn btn-dorado"
                      onClick={descargarBoletaPDF}
                    >
                      Descargar PDF
                    </button>

                    <button
                      type="button"
                      className="btn btn-secundario"
                      onClick={guardarEnKardex}
                    >
                      Guardar en Kardex
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PESTAÑA 6: KARDEX */}
        {pestana === 'kardex' && (
          <section className="tarjeta">
            <div className="tarjeta-header">
              <h2>Kardex — Historial Académico</h2>
            </div>

            <div className="filtros-barra">
              <select
                className="select-control"
                value={matriculaBusqueda}
                onChange={(e) => {
                  setMatriculaBusqueda(e.target.value);
                  if (e.target.value) consultarBoleta(e.target.value);
                }}
              >
                <option value="">Seleccionar alumno...</option>
                {alumnosActivos.map((al) => (
                  <option key={al._id} value={al.matricula}>
                    {al.matricula} — {al.nombre} {al.apellido_p} {al.apellido_m}
                  </option>
                ))}
              </select>

              <button className="btn btn-primario" onClick={() => consultarBoleta()}>
                Consultar
              </button>

              {alumnoKardex && (
                <button className="btn btn-dorado" onClick={descargarKardexPDF}>
                  Descargar Kardex PDF
                </button>
              )}
            </div>

            {alumnoKardex && (
              <div className="boleta-documento">
                <MembreteUTFV tituloDocumento="KARDEX — HISTORIAL ACADÉMICO OFICIAL" />

                <div className="boleta-datos-centrados">
                  <div>
                    <strong>Estudiante</strong>
                    {alumnoKardex.nombre} {alumnoKardex.apellido_p} {alumnoKardex.apellido_m}
                  </div>
                  <div>
                    <strong>Matrícula</strong>
                    {alumnoKardex.matricula}
                  </div>
                  <div>
                    <strong>Carrera</strong>
                    {alumnoKardex.academico?.carrera}
                  </div>
                  <div>
                    <strong>Tutor(a)</strong>
                    {alumnoKardex.academico?.tutor_grupo || '—'}
                  </div>
                </div>

                {(alumnoKardex.kardex || []).length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                    Aún no hay registros en el Kardex.
                  </p>
                ) : (
                  alumnoKardex.kardex.map((bloque, idx) => (
                    <div key={idx} className="kardex-bloque">
                      <div className="kardex-encabezado-periodo">
                        <h3>
                          Cuatrimestre {bloque.cuatrimestre} • {bloque.periodo}
                        </h3>
                        <span className="badge badge-activo">
                          Promedio: {bloque.promedio_cuatrimestre}
                        </span>
                      </div>

                      <div className="tabla-contenedor">
                        <table className="tabla-boleta-centrada">
                          <thead>
                            <tr>
                              <th>Clave</th>
                              <th>Asignatura</th>
                              <th>P1</th>
                              <th>P2</th>
                              <th>P3</th>
                              <th>Calif. EGO</th>
                              <th>Final</th>
                              <th>Estatus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bloque.materias.map((m) => (
                              <tr key={m.clave}>
                                <td>
                                  <strong>{m.clave}</strong>
                                </td>
                                <td>{m.nombre}</td>
                                <td>{m.parcial_1 ?? '—'}</td>
                                <td>{m.parcial_2 ?? '—'}</td>
                                <td>{m.parcial_3 ?? '—'}</td>
                                <td>
                                  {m.calificacion_ego !== null && m.calificacion_ego !== undefined
                                    ? m.calificacion_ego
                                    : m.ego
                                    ? 'Pendiente'
                                    : '—'}
                                </td>
                                <td className="calificacion-final-celda">{m.final ?? '—'}</td>
                                <td>
                                  <span
                                    className={`badge ${
                                      m.estatus_materia?.includes('ACREDITADA') &&
                                      !m.estatus_materia?.includes('NO')
                                        ? 'badge-aprobada'
                                        : m.estatus_materia?.includes('EGO')
                                        ? 'badge-ego'
                                        : 'badge-aspirante'
                                    }`}
                                  >
                                    {m.estatus_materia}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}

export default App;
