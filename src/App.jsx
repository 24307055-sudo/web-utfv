import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3000/api/alumnos`;

function App() {
  const [alumnos, setAlumnos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [pestana, setPestana] = useState('padron');
  const [mensaje, setMensaje] = useState(null);

  // Filtros del padrón general
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('TODOS');

  // Formulario de nuevo aspirante
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
    municipio: 'Nicolás Romero'
  });

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

  const mostrarAlerta = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const cargarAlumnos = async () => {
    setCargando(true);
    try {
      const res = await axios.get(API_URL);
      setAlumnos(res.data);
    } catch (error) {
      mostrarAlerta('error', 'No se pudo conectar con el servidor en el puerto 3000.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAlumnos();
  }, []);

  // Registrar nuevo aspirante
  const manejarRegistroAspirante = async (e) => {
    e.preventDefault();
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
          municipio: nuevoAspirante.municipio.trim()
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
        municipio: 'Nicolás Romero'
      });
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

  // Buscar boleta por matrícula
  const consultarBoleta = async (mat) => {
    const matriculaObjetivo = (mat || matriculaBusqueda).trim();
    if (!matriculaObjetivo) {
      mostrarAlerta('error', 'Ingresa o selecciona una matrícula.');
      return;
    }
    try {
      const res = await axios.get(`${API_URL}/boleta/${matriculaObjetivo}`);
      setAlumnoBoleta(res.data);
      setMatriculaBusqueda(matriculaObjetivo);

      const mapaNotas = {};
      const carga = res.data.cargas_academicas?.[0];
      if (carga) {
        carga.materias.forEach((m) => {
          mapaNotas[m.clave] = {
            parcial_1: m.calificaciones?.parcial_1 ?? '',
            parcial_2: m.calificaciones?.parcial_2 ?? '',
            parcial_3: m.calificaciones?.parcial_3 ?? '',
            final: m.calificaciones?.final ?? ''
          };
        });
      }
      setNotasEditadas(mapaNotas);
    } catch (error) {
      setAlumnoBoleta(null);
      mostrarAlerta('error', 'No se encontró ningún alumno activo con esa matrícula.');
    }
  };

  // Guardar calificación de una materia
  const guardarCalificacionMateria = async (claveMateria) => {
    if (!alumnoBoleta) return;
    const notasMateria = notasEditadas[claveMateria];
    const parciales = [
      { key: 'parcial_1', num: 1 },
      { key: 'parcial_2', num: 2 },
      { key: 'parcial_3', num: 3 },
      { key: 'final', num: 'final' }
    ];

    try {
      for (const p of parciales) {
        const valorRaw = notasMateria[p.key];
        const valorNumerico = valorRaw === '' || valorRaw === null ? null : Number(valorRaw);
        await axios.put(`${API_URL}/calificaciones`, {
          matricula: alumnoBoleta.matricula,
          claveMateria,
          numeroParcial: p.num,
          calificacion: valorNumerico
        });
      }
      mostrarAlerta('exito', `Calificaciones guardadas para la materia ${claveMateria}.`);
      consultarBoleta(alumnoBoleta.matricula);
      cargarAlumnos();
    } catch (error) {
      mostrarAlerta('error', 'Error al guardar la calificación.');
    }
  };

  const cambiarNotaInput = (claveMateria, campo, valor) => {
    setNotasEditadas((prev) => ({
      ...prev,
      [claveMateria]: {
        ...prev[claveMateria],
        [campo]: valor
      }
    }));
  };

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
        <div>
          <h1>Sistema de Gestión Académica — UTFV</h1>
          <p>Universidad Tecnológica Fidel Vázquez • Control Escolar y Cargas Académicas</p>
        </div>
        <div className="estadisticas-barra">
          <div className="stat-chip">Total: {alumnos.length}</div>
          <div className="stat-chip">Aspirantes: {aspirantesDisponibles.length}</div>
          <div className="stat-chip">Activos: {alumnosActivos.length}</div>
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
                              <button
                                className="btn btn-dorado"
                                onClick={() => {
                                  setPestana('boleta');
                                  consultarBoleta(alumno.matricula);
                                }}
                              >
                                Ver Boleta
                              </button>
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
                <label>Teléfono</label>
                <input
                  className="input-control"
                  value={nuevoAspirante.telefono}
                  onChange={(e) =>
                    setNuevoAspirante({ ...nuevoAspirante, telefono: e.target.value })
                  }
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
                <label>Colonia</label>
                <input
                  className="input-control"
                  value={nuevoAspirante.colonia}
                  onChange={(e) =>
                    setNuevoAspirante({ ...nuevoAspirante, colonia: e.target.value })
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
              <div className="campo-grupo">
                <label>Código Postal</label>
                <input
                  type="number"
                  className="input-control"
                  value={nuevoAspirante.c_p}
                  onChange={(e) =>
                    setNuevoAspirante({ ...nuevoAspirante, c_p: e.target.value })
                  }
                />
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
            <>
              <div className="boleta-datos">
                <div>
                  <strong>Alumno:</strong> {alumnoBoleta.nombre} {alumnoBoleta.apellido_p}{' '}
                  {alumnoBoleta.apellido_m}
                </div>
                <div>
                  <strong>Matrícula:</strong> {alumnoBoleta.matricula}
                </div>
                <div>
                  <strong>Carrera:</strong> {alumnoBoleta.academico?.carrera}
                </div>
                <div>
                  <strong>Grupo:</strong> {alumnoBoleta.academico?.grupo} (
                  {alumnoBoleta.academico?.cuatrimestre} Cuatrimestre)
                </div>
                <div>
                  <strong>Periodo:</strong> {alumnoBoleta.academico?.periodo}
                </div>
                <div>
                  <strong>Tutor:</strong> {alumnoBoleta.academico?.tutor_grupo}
                </div>
              </div>

              <div className="tabla-contenedor">
                <table>
                  <thead>
                    <tr>
                      <th>Clave</th>
                      <th>Asignatura</th>
                      <th>Docente</th>
                      <th>Parcial 1</th>
                      <th>Parcial 2</th>
                      <th>Parcial 3</th>
                      <th>Final</th>
                      <th>Guardar</th>
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
                              className="input-calificacion"
                              value={notas.final ?? ''}
                              onChange={(e) =>
                                cambiarNotaInput(mat.clave, 'final', e.target.value)
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="btn btn-primario"
                              onClick={() => guardarCalificacionMateria(mat.clave)}
                            >
                              Guardar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default App;