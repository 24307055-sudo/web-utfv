import { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api/alumnos`;

// Catálogo local de respaldo para municipios del Estado de México por prefijo de CP
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

// Componente vectorial del Logotipo Institucional UTFV (colores exactos de la imagen)
function LogoUTFV({ ancho = 135 }) {
  return (
    <svg width={ancho} viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg" aria-label="Logo UTFV">
      {/* Tres puntos dorados */}
      <circle cx="54" cy="24" r="11" fill="#C48F4B" />
      <circle cx="82" cy="18" r="11" fill="#C48F4B" />
      <circle cx="82" cy="44" r="11" fill="#C48F4B" />
      {/* Letra U en dorado */}
      <path
        d="M44 58 H78 V108 C78 125 89 135 105 135 C121 135 132 125 132 108 V40 H166 V108 C166 144 140 166 105 166 C70 166 44 144 44 108 Z"
        fill="#C48F4B"
      />
      {/* Letra T en vino oscuro */}
      <path
        d="M126 18 H246 V48 H203 V164 H195 C178 164 168 154 168 137 V48 H126 Z"
        fill="#6B2A32"
      />
      {/* Letras FV en terracota */}
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
      {/* Línea divisoria dorada */}
      <line x1="25" y1="174" x2="335" y2="174" stroke="#C48F4B" strokeWidth="2.5" />
      {/* Textos institucionales */}
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

// Componente Membrete Oficial UTFV
function MembreteUTFV({ tituloDocumento }) {
  const fechaHoy = new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="membrete-oficial">
      <div className="membrete-contenido">
        <LogoUTFV ancho={120} />
        <div className="membrete-textos">
          <div className="membrete-gob">GOBIERNO DEL ESTADO DE MÉXICO</div>
          <div className="membrete-uni">UNIVERSIDAD TECNOLÓGICA FIDEL VELÁZQUEZ</div>
          <div className="membrete-depto">
            Dirección de Servicios Escolares y Control Académico
          </div>
          <div className="membrete-doc-titulo">{tituloDocumento}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.8rem', color: '#66585a' }}>
          <strong>Fecha de emisión:</strong>
          <div>{fechaHoy}</div>
          <div style={{ marginTop: '4px', color: '#9E1B32', fontWeight: '700' }}>
            Nicolás Romero, Méx.
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Estado de autenticación de Administrador
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

  // Filtros del padrón general
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');

  // Formulario de nuevo aspirante + automatización CP
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

  // Formulario de inscripción y carga académica
  const [inscripcion, setInscripcion] = useState({
    aspiranteId: '',
    matricula: '',
    claveCarrera: 'IRD',
    grupo: 'IRD-401',
    tutor_grupo: 'M. en D. Arturo Hernández Jiménez'
  });

  // Consulta y captura de boleta
  const [matriculaBusqueda, setMatriculaBusqueda] = useState('');
  const [alumnoBoleta, setAlumnoBoleta] = useState(null);
  const [notasEditadas, setNotasEditadas] = useState({});
  const [edicionBloqueada, setEdicionBloqueada] = useState(false);

  // Consulta de Kardex
  const [alumnoKardex, setAlumnoKardex] = useState(null);

  const mostrarAlerta = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  // Manejar inicio de sesión de Administrador
  const manejarLogin = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    setValidandoLogin(true);
    try {
      await axios.post(`${API_URL}/login`, loginData);
      sessionStorage.setItem('utfv_admin_auth', 'true');
      setAutenticado(true);
    } catch (error) {
      // Respaldo por si el servidor aún está despertando
      if (loginData.usuario === 'admin' && loginData.password === 'utfv2026') {
        sessionStorage.setItem('utfv_admin_auth', 'true');
        setAutenticado(true);
      } else {
        setErrorLogin('Usuario o contraseña de administrador incorrectos.');
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

  // Automatización de Código Postal (5 dígitos)
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
      mostrarAlerta('exito', `CP ${cpLimpio} localizado: ${listaColonias.length} colonia(s) encontradas.`);
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
      mostrarAlerta('error', 'CP no encontrado en el catálogo automático; puedes escribir la colonia manualmente.');
    } finally {
      setBuscandoCP(false);
    }
  };

  // Registrar nuevo aspirante
  const manejarRegistroAspirante = async (e) => {
    e.preventDefault();
    if (nuevoAspirante.telefono && nuevoAspirante.telefono.length !== 10) {
      mostrarAlerta('error', 'El teléfono celular debe tener exactamente 10 dígitos.');
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
      mostrarAlerta('exito', 'Aspirante registrado correctamente en la base de datos.');
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
      mostrarAlerta('error', 'Error al registrar al aspirante. Verifica los campos.');
    }
  };

  // Inscribir aspirante con carga académica automática
  const manejarInscripcion = async (e) => {
    e.preventDefault();
    if (!inscripcion.aspiranteId) {
      mostrarAlerta('error', 'Selecciona un aspirante de la lista.');
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
        grupo: 'IRD-401',
        tutor_grupo: 'M. en D. Arturo Hernández Jiménez'
      });
      cargarAlumnos();
      setPestana('padron');
    } catch (error) {
      mostrarAlerta('error', 'Error al inscribir. Verifica que la matrícula no esté repetida.');
    }
  };

  // Eliminar registro
  const manejarEliminar = async (id, nombreCompleto) => {
    if (!window.confirm(`¿Deseas eliminar el registro de ${nombreCompleto}?`)) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      mostrarAlerta('exito', 'Registro eliminado correctamente.');
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'No se pudo eliminar el registro.');
    }
  };

  // Buscar boleta y kardex por matrícula
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
          const fin = m.calificaciones?.final ?? '';
          if (p1 !== '' || p2 !== '' || p3 !== '' || fin !== '') {
            tieneCalificacionesGuardadas = true;
          }
          mapaNotas[m.clave] = {
            parcial_1: p1,
            parcial_2: p2,
            parcial_3: p3,
            final: fin
          };
        });
      }

      setNotasEditadas(mapaNotas);
      // Si ya tiene calificaciones guardadas, se bloquea hasta presionar "Corregir Calificaciones"
      setEdicionBloqueada(tieneCalificacionesGuardadas);
      if (irAPestana) setPestana(irAPestana);
    } catch (error) {
      setAlumnoBoleta(null);
      setAlumnoKardex(null);
      mostrarAlerta('error', 'No se encontró ningún alumno activo con esa matrícula.');
    }
  };

  // Cálculo automático de promedio por materia al capturar parciales
  const cambiarNotaInput = (claveMateria, campo, valor) => {
    setNotasEditadas((prev) => {
      const actual = { ...prev[claveMateria], [campo]: valor };

      if (campo !== 'final') {
        const parcialesValidos = [actual.parcial_1, actual.parcial_2, actual.parcial_3]
          .filter((v) => v !== '' && v !== null && !isNaN(Number(v)))
          .map(Number);

        if (parcialesValidos.length > 0) {
          const suma = parcialesValidos.reduce((acc, n) => acc + n, 0);
          actual.final = (suma / parcialesValidos.length).toFixed(1);
        } else {
          actual.final = '';
        }
      }

      return {
        ...prev,
        [claveMateria]: actual
      };
    });
  };

  // Guardar TODAS las calificaciones de una sola vez + actualizar Kardex
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
      mostrarAlerta(
        'exito',
        'Todas las calificaciones se guardaron de una sola vez y se actualizaron en el Kardex.'
      );
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'Error al guardar las calificaciones.');
    }
  };

  // Guardar explícitamente en el registro académico (Kardex)
  const guardarEnKardex = async () => {
    if (!alumnoBoleta) return;
    try {
      const res = await axios.post(`${API_URL}/kardex/${alumnoBoleta.matricula}`);
      setAlumnoBoleta(res.data.alumno);
      setAlumnoKardex(res.data.alumno);
      mostrarAlerta('exito', 'Registro académico consolidado y guardado en el Kardex.');
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'No se pudo actualizar el Kardex.');
    }
  };

  // Calcular promedio general de la boleta en tiempo real
  const calcularPromedioGeneral = () => {
    const lista = Object.values(notasEditadas)
      .map((n) => n.final)
      .filter((f) => f !== '' && f !== null && !isNaN(Number(f)))
      .map(Number);

    if (lista.length === 0) return '0.0';
    const suma = lista.reduce((acc, val) => acc + val, 0);
    return (suma / lista.length).toFixed(2);
  };

  // Generar PDF oficial con membrete de la Boleta
  const descargarBoletaPDF = () => {
    if (!alumnoBoleta) return;
    const doc = new jsPDF();
    const promedioGen = calcularPromedioGeneral();

    // Encabezado / Membrete institucional
    doc.setFillColor(158, 27, 50); // Guinda UTFV
    doc.rect(0, 0, 210, 34, 'F');
    doc.setFillColor(196, 143, 75); // Dorado UTFV
    doc.rect(0, 34, 210, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('GOBIERNO DEL ESTADO DE MÉXICO', 105, 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('UNIVERSIDAD TECNOLÓGICA FIDEL VELÁZQUEZ', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Dirección de Servicios Escolares • Boleta Oficial de Calificaciones', 105, 26, {
      align: 'center'
    });

    // Datos del alumno centrados
    doc.setTextColor(44, 36, 37);
    doc.setFontSize(10);
    const nombreCompleto = `${alumnoBoleta.nombre} ${alumnoBoleta.apellido_p} ${alumnoBoleta.apellido_m}`;
    doc.setFont('helvetica', 'bold');
    doc.text(`ALUMNO: ${nombreCompleto}`, 105, 47, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text(
      `MATRÍCULA: ${alumnoBoleta.matricula}   |   GRUPO: ${alumnoBoleta.academico?.grupo} (${alumnoBoleta.academico?.cuatrimestre} Cuatrimestre)`,
      105,
      54,
      { align: 'center' }
    );
    doc.text(`CARRERA: ${alumnoBoleta.academico?.carrera}`, 105, 61, { align: 'center' });
    doc.text(
      `PERIODO: ${alumnoBoleta.academico?.periodo}   |   TUTOR: ${alumnoBoleta.academico?.tutor_grupo}`,
      105,
      68,
      { align: 'center' }
    );

    const filas = (alumnoBoleta.cargas_academicas?.[0]?.materias || []).map((mat) => {
      const n = notasEditadas[mat.clave] || {};
      return [
        mat.clave,
        mat.nombre,
        mat.profesor,
        n.parcial_1 !== '' && n.parcial_1 !== null ? n.parcial_1 : '-',
        n.parcial_2 !== '' && n.parcial_2 !== null ? n.parcial_2 : '-',
        n.parcial_3 !== '' && n.parcial_3 !== null ? n.parcial_3 : '-',
        n.final !== '' && n.final !== null ? n.final : '-'
      ];
    });

    autoTable(doc, {
      startY: 75,
      head: [['Clave', 'Asignatura', 'Docente', 'Parcial 1', 'Parcial 2', 'Parcial 3', 'Final']],
      body: filas,
      theme: 'grid',
      headStyles: {
        fillColor: [158, 27, 50],
        textColor: [255, 255, 255],
        halign: 'center',
        fontStyle: 'bold'
      },
      styles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 8.5,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [253, 248, 248]
      }
    });

    const finalY = doc.lastAutoTable.finalY + 12;

    // Caja de Promedio General
    doc.setFillColor(107, 42, 50);
    doc.roundedRect(65, finalY, 80, 16, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`PROMEDIO GENERAL: ${promedioGen}`, 105, finalY + 10.5, { align: 'center' });

    // Firmas institucionales
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.line(30, finalY + 38, 90, finalY + 38);
    doc.text('Control Escolar UTFV', 60, finalY + 43, { align: 'center' });

    doc.line(120, finalY + 38, 180, finalY + 38);
    doc.text('Tutor de Grupo', 150, finalY + 43, { align: 'center' });

    doc.save(`Boleta_UTFV_${alumnoBoleta.matricula}.pdf`);
  };

  // Generar PDF oficial del Kardex Académico
  const descargarKardexPDF = () => {
    if (!alumnoKardex) return;
    const doc = new jsPDF();

    doc.setFillColor(107, 42, 50);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setFillColor(196, 143, 75);
    doc.rect(0, 34, 210, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('GOBIERNO DEL ESTADO DE MÉXICO', 105, 10, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('UNIVERSIDAD TECNOLÓGICA FIDEL VELÁZQUEZ', 105, 18, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Historial Académico Oficial (Kardex)', 105, 26, { align: 'center' });

    const nombreCompleto = `${alumnoKardex.nombre} ${alumnoKardex.apellido_p} ${alumnoKardex.apellido_m}`;
    doc.setTextColor(44, 36, 37);
    doc.setFont('helvetica', 'bold');
    doc.text(`ESTUDIANTE: ${nombreCompleto}   |   MATRÍCULA: ${alumnoKardex.matricula}`, 105, 46, {
      align: 'center'
    });
    doc.setFont('helvetica', 'normal');
    doc.text(`CARRERA: ${alumnoKardex.academico?.carrera || ''}`, 105, 53, { align: 'center' });

    let cursorY = 62;
    const historial = alumnoKardex.kardex || [];

    historial.forEach((bloque) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(158, 27, 50);
      doc.text(
        `Cuatrimestre ${bloque.cuatrimestre} — Periodo: ${bloque.periodo} | Promedio: ${bloque.promedio_cuatrimestre}`,
        105,
        cursorY,
        { align: 'center' }
      );

      autoTable(doc, {
        startY: cursorY + 4,
        head: [['Clave', 'Asignatura', 'P1', 'P2', 'P3', 'Final', 'Estatus']],
        body: bloque.materias.map((m) => [
          m.clave,
          m.nombre,
          m.parcial_1 ?? '-',
          m.parcial_2 ?? '-',
          m.parcial_3 ?? '-',
          m.final ?? '-',
          m.estatus_materia
        ]),
        theme: 'grid',
        headStyles: { fillColor: [158, 27, 50], halign: 'center' },
        styles: { halign: 'center', fontSize: 8.5 }
      });

      cursorY = doc.lastAutoTable.finalY + 12;
    });

    doc.save(`Kardex_UTFV_${alumnoKardex.matricula}.pdf`);
  };

  // ================= PANTALLA DE LOGIN ADMINISTRADOR =================
  if (!autenticado) {
    return (
      <div className="login-pantalla">
        <div className="login-tarjeta">
          <LogoUTFV ancho={165} />
          <h1 className="login-titulo">Acceso Administrativo</h1>
          <p className="login-subtitulo">
            Sistema de Control Escolar y Gestión Académica
          </p>

          {errorLogin && (
            <div className="alerta error" style={{ textAlign: 'left' }}>
              <span>{errorLogin}</span>
            </div>
          )}

          <form onSubmit={manejarLogin} className="login-form">
            <div className="campo-grupo">
              <label>Usuario Administrador</label>
              <input
                type="text"
                className="input-control"
                placeholder="Ingresa tu usuario"
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
              style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
              disabled={validandoLogin}
            >
              {validandoLogin ? 'Verificando acceso...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="login-ayuda">
            Acceso exclusivo para personal autorizado de la UTFV
          </div>
        </div>
      </div>
    );
  }

  // Filtrado de alumnos
  const alumnosFiltrados = alumnos.filter((a) => {
    const nombreCompleto = `${a.nombre} ${a.apellido_p} ${a.apellido_m}`.toLowerCase();
    const mat = (a.matricula || '').toLowerCase();
    const coincideTexto =
      nombreCompleto.includes(busqueda.toLowerCase()) ||
      mat.includes(busqueda.toLowerCase());
    const coincideEstatus = filtroEstatus === 'TODOS' || a.estatus === filtroEstatus;
    return coincideTexto && coincideEstatus;
  });

  const aspirantesDisponibles = alumnos.filter((a) => a.estatus === 'ASPIRANTE');
  const alumnosActivos = alumnos.filter((a) => a.estatus === 'ALUMNO_ACTIVO');

  return (
    <div className="contenedor-principal">
      <header className="encabezado">
        <div className="encabezado-izquierda">
          <div className="logo-badge-blanco">
            <LogoUTFV ancho={92} />
          </div>
          <div>
            <h1>Sistema de Gestión Académica — UTFV</h1>
            <p>Universidad Tecnológica Fidel Velázquez • Control Escolar y Kardex</p>
          </div>
        </div>

        <div className="estadisticas-barra">
          <div className="stat-chip">Total: {alumnos.length}</div>
          <div className="stat-chip">Aspirantes: {aspirantesDisponibles.length}</div>
          <div className="stat-chip">Activos: {alumnosActivos.length}</div>
          <button className="btn-salir" onClick={cerrarSesion}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      <nav className="navegacion">
        <button
          className={`btn-tab ${pestana === 'padron' ? 'activo' : ''}`}
          onClick={() => setPestana('padron')}
        >
          1. Padrón General ({alumnos.length})
        </button>
        <button
          className={`btn-tab ${pestana === 'aspirante' ? 'activo' : ''}`}
          onClick={() => setPestana('aspirante')}
        >
          2. Registrar Aspirante
        </button>
        <button
          className={`btn-tab ${pestana === 'inscripcion' ? 'activo' : ''}`}
          onClick={() => setPestana('inscripcion')}
        >
          3. Inscripción y Carga Académica
        </button>
        <button
          className={`btn-tab ${pestana === 'boleta' ? 'activo' : ''}`}
          onClick={() => setPestana('boleta')}
        >
          4. Boleta y Calificaciones
        </button>
        <button
          className={`btn-tab ${pestana === 'kardex' ? 'activo' : ''}`}
          onClick={() => setPestana('kardex')}
        >
          5. Kardex / Historial Académico
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
          <h2>Padrón de Aspirantes y Alumnos Activos</h2>
          <div className="filtros-barra">
            <input
              type="text"
              className="input-control"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="Buscar por nombre, apellidos o matrícula..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className="select-control"
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
            >
              <option value="TODOS">Todos los estatus</option>
              <option value="ASPIRANTE">Solo Aspirantes</option>
              <option value="ALUMNO_ACTIVO">Solo Alumnos Activos</option>
            </select>
          </div>

          {cargando ? (
            <p>Cargando registros desde MongoDB Atlas...</p>
          ) : (
            <div className="tabla-contenedor">
              <table>
                <thead>
                  <tr>
                    <th>Estatus</th>
                    <th>Matrícula</th>
                    <th>Nombre Completo</th>
                    <th>Carrera / Grupo</th>
                    <th>Municipio</th>
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
                            {alumno.estatus}
                          </span>
                        </td>
                        <td>
                          <strong>{alumno.matricula || 'Sin asignar'}</strong>
                        </td>
                        <td>{nombreCompleto}</td>
                        <td>
                          {alumno.academico?.carrera
                            ? `${alumno.academico.grupo} — ${alumno.academico.carrera}`
                            : 'Pendiente de inscripción'}
                        </td>
                        <td>{alumno.direccion?.municipio || 'N/A'}</td>
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
                                  className="btn btn-vino"
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
                  <span>Teléfono Celular (10 dígitos)</span>
                  <span className="ayuda-campo">{nuevoAspirante.telefono.length}/10</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="Ej. 5512345678"
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

            <p className="subtitulo-seccion">Domicilio (Código Postal Automatizado)</p>
            <div className="grid-formulario">
              <div className="campo-grupo">
                <label>
                  <span>Código Postal (5 dígitos)</span>
                  {buscandoCP && <span className="ayuda-campo">Buscando...</span>}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="Ej. 54400"
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
                    placeholder="Escribe el CP arriba o ingresa colonia"
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

      {/* PESTAÑA 3: INSCRIPCIÓN Y CARGA ACADÉMICA */}
      {pestana === 'inscripcion' && (
        <section className="tarjeta">
          <h2>Inscripción Oficial y Asignación de Tira de Materias</h2>
          <form onSubmit={manejarInscripcion}>
            <div className="grid-formulario">
              <div className="campo-grupo">
                <label>Seleccionar Aspirante *</label>
                <select
                  className="select-control"
                  required
                  value={inscripcion.aspiranteId}
                  onChange={(e) =>
                    setInscripcion({ ...inscripcion, aspiranteId: e.target.value })
                  }
                >
                  <option value="">-- Elige un aspirante --</option>
                  {aspirantesDisponibles.map((asp) => (
                    <option key={asp._id} value={asp._id}>
                      {asp.nombre} {asp.apellido_p} {asp.apellido_m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo-grupo">
                <label>Matrícula Asignada *</label>
                <input
                  className="input-control"
                  placeholder="Ej. 24307055"
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
                    const grupoDefault =
                      clave === 'IRD'
                        ? 'IRD-401'
                        : clave === 'LITIID'
                        ? 'LITIID-701'
                        : 'IRIC-1001';
                    setInscripcion({
                      ...inscripcion,
                      claveCarrera: clave,
                      grupo: grupoDefault
                    });
                  }}
                >
                  <option value="IRD">IRD — T.S.U. Infraestructura de Redes Digitales (4°)</option>
                  <option value="LITIID">
                    LITIID — Ing. en Tecnologías de la Información e Innovación Digital (7°)
                  </option>
                  <option value="IRIC">
                    IRIC — Ing. en Redes Inteligentes y Ciberseguridad (10°)
                  </option>
                </select>
              </div>

              <div className="campo-grupo">
                <label>Grupo *</label>
                <input
                  className="input-control"
                  placeholder="Ej. IRD-401"
                  required
                  value={inscripcion.grupo}
                  onChange={(e) => setInscripcion({ ...inscripcion, grupo: e.target.value })}
                />
              </div>

              <div className="campo-grupo">
                <label>Tutor de Grupo *</label>
                <input
                  className="input-control"
                  required
                  value={inscripcion.tutor_grupo}
                  onChange={(e) =>
                    setInscripcion({ ...inscripcion, tutor_grupo: e.target.value })
                  }
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primario">
              Inscribir Alumno y Asignar Materias
            </button>
          </form>
        </section>
      )}

      {/* PESTAÑA 4: BOLETA Y CALIFICACIONES */}
      {pestana === 'boleta' && (
        <section className="tarjeta">
          <h2>Boleta de Calificaciones y Evaluación Parcial</h2>

          <div className="filtros-barra">
            <select
              className="select-control"
              value={matriculaBusqueda}
              onChange={(e) => {
                setMatriculaBusqueda(e.target.value);
                if (e.target.value) consultarBoleta(e.target.value);
              }}
            >
              <option value="">-- Seleccionar alumno inscrito --</option>
              {alumnosActivos.map((al) => (
                <option key={al._id} value={al.matricula}>
                  {al.matricula} — {al.nombre} {al.apellido_p} {al.apellido_m}
                </option>
              ))}
            </select>

            <input
              type="text"
              className="input-control"
              placeholder="O escribe la matrícula directamente..."
              value={matriculaBusqueda}
              onChange={(e) => setMatriculaBusqueda(e.target.value)}
            />

            <button className="btn btn-primario" onClick={() => consultarBoleta()}>
              Consultar Boleta
            </button>
          </div>

          {alumnoBoleta && (
            <div className="boleta-documento">
              {/* MEMBRETE OFICIAL UTFV */}
              <MembreteUTFV tituloDocumento="BOLETA OFICIAL DE CALIFICACIONES" />

              {/* DATOS CENTRADOS DEL ALUMNO */}
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
                  <strong>Periodo Escolar</strong>
                  {alumnoBoleta.academico?.periodo}
                </div>
                <div>
                  <strong>Tutor de Grupo</strong>
                  {alumnoBoleta.academico?.tutor_grupo}
                </div>
              </div>

              {/* TABLA CON TEXTO CENTRADO Y PROMEDIO AUTOMÁTICO */}
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
                      <th>Promedio Materia</th>
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
                          <td className="calificacion-final-celda">
                            {notas.final !== '' && notas.final !== null ? notas.final : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* BARRA DE PROMEDIO GENERAL Y BOTONES UNIFICADOS */}
              <div className="boleta-resumen-barra">
                <div className="promedio-caja">
                  <span>Promedio General Automático</span>
                  <strong>{calcularPromedioGeneral()}</strong>
                </div>

                <div className="boleta-botones-acciones">
                  {!edicionBloqueada ? (
                    <button
                      type="button"
                      className="btn btn-dorado"
                      onClick={guardarTodasCalificaciones}
                    >
                      Guardar Todas las Calificaciones
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-terracota"
                      onClick={() => {
                        setEdicionBloqueada(false);
                        mostrarAlerta(
                          'exito',
                          'Modo de corrección activado. Edita las notas y presiona Guardar.'
                        );
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
                    Descargar Boleta en PDF
                  </button>

                  <button
                    type="button"
                    className="btn btn-vino"
                    style={{ border: '1px solid #C48F4B' }}
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

      {/* PESTAÑA 5: KARDEX / REGISTRO ACADÉMICO */}
      {pestana === 'kardex' && (
        <section className="tarjeta">
          <h2>Registro Académico e Historial (Kardex)</h2>

          <div className="filtros-barra">
            <select
              className="select-control"
              value={matriculaBusqueda}
              onChange={(e) => {
                setMatriculaBusqueda(e.target.value);
                if (e.target.value) consultarBoleta(e.target.value);
              }}
            >
              <option value="">-- Seleccionar alumno inscrito --</option>
              {alumnosActivos.map((al) => (
                <option key={al._id} value={al.matricula}>
                  {al.matricula} — {al.nombre} {al.apellido_p} {al.apellido_m}
                </option>
              ))}
            </select>

            <button className="btn btn-primario" onClick={() => consultarBoleta()}>
              Consultar Kardex
            </button>

            {alumnoKardex && (
              <button className="btn btn-dorado" onClick={descargarKardexPDF}>
                Descargar Kardex en PDF
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
                  <strong>Programa Educativo</strong>
                  {alumnoKardex.academico?.carrera}
                </div>
                <div>
                  <strong>Estatus Académico</strong>
                  {alumnoKardex.estatus}
                </div>
              </div>

              {(alumnoKardex.kardex || []).length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px' }}>
                  Aún no hay registros consolidados en el Kardex. Ve a la pestaña de Boleta y
                  guarda las calificaciones.
                </p>
              ) : (
                alumnoKardex.kardex.map((bloque, idx) => (
                  <div key={idx} className="kardex-bloque">
                    <div className="kardex-encabezado-periodo">
                      <h3>
                        Cuatrimestre {bloque.cuatrimestre} • Periodo: {bloque.periodo}
                      </h3>
                      <span className="badge badge-activo">
                        Promedio del Cuatrimestre: {bloque.promedio_cuatrimestre}
                      </span>
                    </div>

                    <div className="tabla-contenedor">
                      <table className="tabla-boleta-centrada">
                        <thead>
                          <tr>
                            <th>Clave</th>
                            <th>Asignatura</th>
                            <th>Docente</th>
                            <th>P1</th>
                            <th>P2</th>
                            <th>P3</th>
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
                              <td>{m.profesor}</td>
                              <td>{m.parcial_1 ?? '-'}</td>
                              <td>{m.parcial_2 ?? '-'}</td>
                              <td>{m.parcial_3 ?? '-'}</td>
                              <td className="calificacion-final-celda">{m.final ?? '-'}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    m.estatus_materia === 'ACREDITADA'
                                      ? 'badge-aprobada'
                                      : m.estatus_materia === 'NO ACREDITADA'
                                      ? 'badge-reprobada'
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
    </div>
  );
}

export default App;

