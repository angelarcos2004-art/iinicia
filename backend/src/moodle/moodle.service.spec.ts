import { BadGatewayException, BadRequestException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { MoodleService } from './moodle.service.js';

const MOODLE_URL = 'http://moodle.test:8080/';
const TOKEN = 'token-de-prueba-no-real';

function makeService(env: Record<string, string> = {}) {
  const config = {
    getOrThrow: (key: string) => {
      if (key === 'MOODLE_URL') return MOODLE_URL;
      if (key === 'MOODLE_TOKEN') return TOKEN;
      throw new Error(`falta ${key}`);
    },
    get: (key: string, def?: string) => env[key] ?? def,
  } as unknown as ConfigService;
  return new MoodleService(config);
}

/** Cada elemento es el cuerpo JSON (o Response) que devolverá una llamada a Moodle. */
function mockFetch(...responses: Array<unknown | Response>) {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce(
      r instanceof Response ? r : new Response(JSON.stringify(r), { status: 200 }),
    );
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}

function paramsDeLlamada(fn: ReturnType<typeof vi.fn>, n: number): URLSearchParams {
  return new URLSearchParams((fn.mock.calls[n][1] as { body: URLSearchParams }).body.toString());
}

afterEach(() => vi.unstubAllGlobals());

describe('MoodleService.buscarOCrearUsuarioMoodle', () => {
  it('si el usuario ya existe devuelve su id y NO lo crea (idempotente)', async () => {
    const fetchFn = mockFetch([{ id: 42, email: 'ana@correo.com' }]);

    const id = await makeService().buscarOCrearUsuarioMoodle('Ana@Correo.com ', 'Ana Pérez');

    expect(id).toBe(42);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const p = paramsDeLlamada(fetchFn, 0);
    expect(p.get('wsfunction')).toBe('core_user_get_users_by_field');
    expect(p.get('field')).toBe('email');
    expect(p.get('values[0]')).toBe('ana@correo.com');
  });

  it('si no existe lo crea con username derivado y password aleatoria', async () => {
    const fetchFn = mockFetch([], [{ id: 77, username: 'ana@correo.com' }]);

    const id = await makeService().buscarOCrearUsuarioMoodle('ana@correo.com', 'Ana María Pérez');

    expect(id).toBe(77);
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const p = paramsDeLlamada(fetchFn, 1);
    expect(p.get('wsfunction')).toBe('core_user_create_users');
    expect(p.get('users[0][username]')).toBe('ana@correo.com');
    expect(p.get('users[0][email]')).toBe('ana@correo.com');
    expect(p.get('users[0][firstname]')).toBe('Ana');
    expect(p.get('users[0][lastname]')).toBe('María Pérez');
    expect(p.get('users[0][auth]')).toBe('manual');
    const password = p.get('users[0][password]') ?? '';
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[^A-Za-z0-9]/);
    expect(password.length).toBeGreaterThanOrEqual(12);
  });

  it('genera una password distinta en cada creación', async () => {
    const f1 = mockFetch([], [{ id: 1 }]);
    await makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B');
    const p1 = paramsDeLlamada(f1, 1).get('users[0][password]');
    const f2 = mockFetch([], [{ id: 2 }]);
    await makeService().buscarOCrearUsuarioMoodle('c@d.com', 'C D');
    const p2 = paramsDeLlamada(f2, 1).get('users[0][password]');
    expect(p1).not.toBe(p2);
  });

  it('usa "-" como apellido si el nombre tiene una sola palabra', async () => {
    const fetchFn = mockFetch([], [{ id: 5 }]);
    await makeService().buscarOCrearUsuarioMoodle('x@y.com', 'Madonna');
    const p = paramsDeLlamada(fetchFn, 1);
    expect(p.get('users[0][firstname]')).toBe('Madonna');
    expect(p.get('users[0][lastname]')).toBe('-');
  });

  it('llama a {MOODLE_URL}/webservice/rest/server.php por POST form-urlencoded', async () => {
    const fetchFn = mockFetch([{ id: 1 }]);
    await makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B');

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://moodle.test:8080/webservice/rest/server.php');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe(
      'application/x-www-form-urlencoded',
    );
    const p = paramsDeLlamada(fetchFn, 0);
    expect(p.get('wstoken')).toBe(TOKEN);
    expect(p.get('moodlewsrestformat')).toBe('json');
  });

  it('si la creación falla por carrera pero el usuario ya existe, devuelve ese id', async () => {
    mockFetch(
      [], // búsqueda inicial: no existe
      { exception: 'invalid_parameter_exception', errorcode: 'invalidparameter', message: 'Username already exists' },
      [{ id: 99 }], // re-búsqueda: otra petición ya lo creó
    );
    await expect(
      makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B'),
    ).resolves.toBe(99);
  });

  it('si Moodle responde con error (HTTP 200 + exception) lanza 502 sin filtrar el token', async () => {
    mockFetch({ exception: 'moodle_exception', errorcode: 'invalidtoken', message: 'Invalid token' });
    const promesa = makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B');
    await expect(promesa).rejects.toBeInstanceOf(BadGatewayException);
    await expect(promesa).rejects.toSatisfy((e: Error) => !e.message.includes(TOKEN));
  });

  it('lanza 502 si falla la conexión de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('lanza 502 si Moodle responde HTTP 500', async () => {
    mockFetch(new Response('boom', { status: 500 }));
    await expect(makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('lanza 502 si el cuerpo no es JSON', async () => {
    mockFetch(new Response('<html>no json</html>', { status: 200 }));
    await expect(makeService().buscarOCrearUsuarioMoodle('a@b.com', 'A B')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('rechaza correo vacío sin llamar a Moodle', async () => {
    const fetchFn = mockFetch();
    await expect(makeService().buscarOCrearUsuarioMoodle('  ', 'A B')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('MoodleService.matricularEnCurso', () => {
  const cursoEncontrado = { courses: [{ id: 2, shortname: 'IINICIA101' }], warnings: [] };

  it('busca el curso por shortname y matricula con roleid 5 por defecto', async () => {
    const fetchFn = mockFetch(cursoEncontrado, null);

    await expect(makeService().matricularEnCurso(42, 'IINICIA101')).resolves.toBeUndefined();

    expect(fetchFn).toHaveBeenCalledTimes(2);
    const busqueda = paramsDeLlamada(fetchFn, 0);
    expect(busqueda.get('wsfunction')).toBe('core_course_get_courses_by_field');
    expect(busqueda.get('field')).toBe('shortname');
    expect(busqueda.get('value')).toBe('IINICIA101');
    const matricula = paramsDeLlamada(fetchFn, 1);
    expect(matricula.get('wsfunction')).toBe('enrol_manual_enrol_users');
    expect(matricula.get('enrolments[0][roleid]')).toBe('5');
    expect(matricula.get('enrolments[0][userid]')).toBe('42');
    expect(matricula.get('enrolments[0][courseid]')).toBe('2');
    expect(matricula.get('wstoken')).toBe(TOKEN);
    expect(matricula.get('moodlewsrestformat')).toBe('json');
  });

  it('usa MOODLE_ROLEID_STUDENT si está definida', async () => {
    const fetchFn = mockFetch(cursoEncontrado, null);
    await makeService({ MOODLE_ROLEID_STUDENT: '7' }).matricularEnCurso(42, 'IINICIA101');
    expect(paramsDeLlamada(fetchFn, 1).get('enrolments[0][roleid]')).toBe('7');
  });

  it('usa el id del primer curso si Moodle devuelve varios', async () => {
    const fetchFn = mockFetch({ courses: [{ id: 9 }, { id: 3 }] }, null);
    await makeService().matricularEnCurso(1, 'X');
    expect(paramsDeLlamada(fetchFn, 1).get('enrolments[0][courseid]')).toBe('9');
  });

  it('si el curso no existe lanza 502 y NO intenta matricular', async () => {
    const fetchFn = mockFetch({ courses: [], warnings: [] });
    await expect(makeService().matricularEnCurso(42, 'NOEXISTE')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('si Moodle rechaza la matrícula (HTTP 200 + exception) lanza 502 sin filtrar el token', async () => {
    mockFetch(cursoEncontrado, {
      exception: 'moodle_exception',
      errorcode: 'wsusercannotassign',
      message: 'No puede asignar ese rol',
    });
    const promesa = makeService().matricularEnCurso(42, 'IINICIA101');
    await expect(promesa).rejects.toBeInstanceOf(BadGatewayException);
    await expect(promesa).rejects.toSatisfy((e: Error) => !e.message.includes(TOKEN));
  });

  it('si falla la búsqueda del curso por error de Moodle lanza 502', async () => {
    mockFetch({ exception: 'moodle_exception', errorcode: 'accessexception', message: 'denegado' });
    await expect(makeService().matricularEnCurso(42, 'IINICIA101')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('lanza 502 si falla la conexión de red', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(makeService().matricularEnCurso(42, 'IINICIA101')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});

describe('MoodleService.obtenerCursosDeUsuario', () => {
  it('mapea los cursos y pasa userid correctamente', async () => {
    const fetchFn = mockFetch([
      { id: 2, shortname: 'IINICIA101', fullname: 'Test course: XS', progress: null },
    ]);

    const cursos = await makeService().obtenerCursosDeUsuario(17);

    expect(cursos).toEqual([
      { id: 2, shortname: 'IINICIA101', fullname: 'Test course: XS', progress: null },
    ]);
    const p = paramsDeLlamada(fetchFn, 0);
    expect(p.get('wsfunction')).toBe('core_enrol_get_users_courses');
    expect(p.get('userid')).toBe('17');
  });

  it('conserva el progreso cuando Moodle sí lo reporta (curso con seguimiento activado)', async () => {
    mockFetch([{ id: 2, shortname: 'IINICIA101', fullname: 'Curso', progress: 42.5 }]);
    const cursos = await makeService().obtenerCursosDeUsuario(17);
    expect(cursos[0].progress).toBe(42.5);
  });

  it('devuelve lista vacía si el usuario no está inscrito en ningún curso', async () => {
    mockFetch([]);
    await expect(makeService().obtenerCursosDeUsuario(17)).resolves.toEqual([]);
  });

  it('lanza 502 si Moodle falla', async () => {
    mockFetch(new Response('boom', { status: 500 }));
    await expect(makeService().obtenerCursosDeUsuario(17)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});

describe('MoodleService.obtenerActividadesProximas', () => {
  it('mapea los eventos y pide timesortfrom = ahora', async () => {
    const fetchFn = mockFetch({
      events: [
        {
          id: 5,
          name: 'Entrega Tarea 1',
          timesort: 1_700_000_000,
          course: { fullname: 'Test course: XS' },
          action: { url: 'http://moodle.test:8080/mod/assign/view.php?id=5' },
        },
      ],
    });

    const actividades = await makeService().obtenerActividadesProximas(17);

    expect(actividades).toEqual([
      {
        id: 5,
        titulo: 'Entrega Tarea 1',
        curso: 'Test course: XS',
        fecha: new Date(1_700_000_000 * 1000).toISOString(),
        url: 'http://moodle.test:8080/mod/assign/view.php?id=5',
      },
    ]);
    const p = paramsDeLlamada(fetchFn, 0);
    expect(p.get('wsfunction')).toBe('core_calendar_get_action_events_by_timesort');
    expect(p.get('userid')).toBe('17');
    expect(Number(p.get('timesortfrom'))).toBeGreaterThan(0);
  });

  it('devuelve lista vacía si Moodle no reporta eventos', async () => {
    mockFetch({ events: [] });
    await expect(makeService().obtenerActividadesProximas(17)).resolves.toEqual([]);
  });

  it('usa curso vacío y url null cuando Moodle no los incluye', async () => {
    mockFetch({ events: [{ id: 1, name: 'Evento', timesort: 1_700_000_000 }] });
    const actividades = await makeService().obtenerActividadesProximas(17);
    expect(actividades[0].curso).toBe('');
    expect(actividades[0].url).toBeNull();
  });

  it('lanza 502 si Moodle falla', async () => {
    mockFetch(new Response('boom', { status: 500 }));
    await expect(makeService().obtenerActividadesProximas(17)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});

describe('MoodleService.listarCursos', () => {
  it('mapea los cursos y excluye el curso "sitio" (id 1)', async () => {
    const fetchFn = mockFetch([
      { id: 1, shortname: 'SITE', fullname: 'Sitio' },
      { id: 2, shortname: 'IINICIA101', fullname: 'Curso de prueba' },
    ]);

    const cursos = await makeService().listarCursos();

    expect(cursos).toEqual([{ id: 2, shortname: 'IINICIA101', fullname: 'Curso de prueba' }]);
    const p = paramsDeLlamada(fetchFn, 0);
    expect(p.get('wsfunction')).toBe('core_course_get_courses');
  });

  it('lanza 502 si Moodle falla', async () => {
    mockFetch(new Response('boom', { status: 500 }));
    await expect(makeService().listarCursos()).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('MoodleService.solicitarUrlAutologin', () => {
  it('pide la url por email (auth_userkey_request_login_url) y la devuelve tal cual', async () => {
    const fetchFn = mockFetch({ loginurl: 'http://moodle.test:8080/auth/userkey/login.php?key=abc' });

    const url = await makeService().solicitarUrlAutologin('Ana@Correo.com ');

    expect(url).toBe('http://moodle.test:8080/auth/userkey/login.php?key=abc');
    const p = paramsDeLlamada(fetchFn, 0);
    expect(p.get('wsfunction')).toBe('auth_userkey_request_login_url');
    expect(p.get('user[email]')).toBe('ana@correo.com');
  });

  it('arma wantsurl con el origen público de loginurl, NUNCA con MOODLE_URL', async () => {
    // Replica el caso real en Docker: MOODLE_URL (el nombre interno que usa
    // el backend para llegar a Moodle, "http://moodle.test:8080" en este test)
    // es distinto del wwwroot público con el que Moodle arma loginurl (el que
    // sí puede resolver el navegador). Si el código usara MOODLE_URL para el
    // wantsurl, el navegador terminaría con "No se ha podido encontrar la
    // dirección IP del servidor de moodle" al volver del login.
    mockFetch({ loginurl: 'http://localhost:8080/auth/userkey/login.php?key=abc' });

    const url = await makeService().solicitarUrlAutologin('a@b.com', 2);

    expect(url).toBe(
      'http://localhost:8080/auth/userkey/login.php?key=abc&wantsurl=' +
        encodeURIComponent('http://localhost:8080/course/view.php?id=2'),
    );
  });

  it('lanza 502 si Moodle no devuelve loginurl', async () => {
    mockFetch({ loginurl: '' });
    await expect(makeService().solicitarUrlAutologin('a@b.com')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('arma wantsurl con la url de actividad cuando se da actividadUrl', async () => {
    mockFetch({ loginurl: 'http://localhost:8080/auth/userkey/login.php?key=abc' });

    const url = await makeService().solicitarUrlAutologin(
      'a@b.com',
      undefined,
      'http://localhost:8080/mod/assign/view.php?id=5',
    );

    expect(url).toBe(
      'http://localhost:8080/auth/userkey/login.php?key=abc&wantsurl=' +
        encodeURIComponent('http://localhost:8080/mod/assign/view.php?id=5'),
    );
  });

  it('rechaza actividadUrl de otro origen (no pertenece a este Moodle)', async () => {
    mockFetch({ loginurl: 'http://localhost:8080/auth/userkey/login.php?key=abc' });

    await expect(
      makeService().solicitarUrlAutologin('a@b.com', undefined, 'http://evil.example/x'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza actividadUrl malformada', async () => {
    mockFetch({ loginurl: 'http://localhost:8080/auth/userkey/login.php?key=abc' });

    await expect(
      makeService().solicitarUrlAutologin('a@b.com', undefined, 'no-es-una-url'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lanza 502 si Moodle rechaza la petición (p. ej. plugin deshabilitado)', async () => {
    mockFetch({
      exception: 'webservice_access_exception',
      errorcode: 'nopermissions',
      message: 'pluginisdisabled',
    });
    await expect(makeService().solicitarUrlAutologin('a@b.com')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });
});
