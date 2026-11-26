# `infrastructure/moodle-custom/auth/userkey/classes/userkey_manager_interface.php`

**En una frase:** el contrato (interfaz PHP) que cualquier "gestor de llaves" debe cumplir para que `auth.php` pueda usarlo, sin importar cómo guarde o valide las llaves por dentro.

## Por qué existe

`auth.php` no debería tener que saber si las llaves se guardan en la tabla `user_private_key` de Moodle, en Redis, o en memoria para una prueba automatizada — solo necesita saber que puede pedir "crea una llave", "bórrala" y "valídala". Una interfaz en PHP define exactamente esos tres métodos, sin implementación, y cualquier clase que los implemente (`implements userkey_manager_interface`) puede sustituir a otra sin que `auth.php` cambie una sola línea.

Esto es lo que hace posible el método `set_userkey_manager()` de `auth.php` ("La única forma de inyectar esta dependencia, por cómo funcionan los plugins de auth" — comentario textual del código): en las pruebas PHPUnit del plugin (mencionadas en `infrastructure/README.md`, carpeta `tests/`, que este trabajo de documentación no cubre a propósito), se usa un doble de prueba (`fake_userkey_manager`) que cumple esta misma interfaz pero sin tocar la base de datos real — así se puede probar la lógica de `auth.php` (qué pasa si la llave expiró, qué pasa si ya hay sesión, etc.) sin depender de Moodle completo.

## Recorrido del código

```php
interface userkey_manager_interface {
    public function create_key($userid, $allowedips = null);
    public function delete_keys($userid);
    public function validate_key($keyvalue);
}
```

Tres métodos, sin cuerpo (una interfaz en PHP nunca tiene implementación, solo firmas):

- `create_key($userid, $allowedips = null)`: genera una llave nueva para ese usuario, con restricción de IP opcional.
- `delete_keys($userid)`: borra todas las llaves vivas de ese usuario.
- `validate_key($keyvalue)`: comprueba si una llave es válida (existe, no venció, cumple la IP) y devuelve el objeto de la llave (que incluye el `userid` al que apunta) o lanza una excepción.

`core_userkey_manager` (ver `core_userkey_manager.md`) es la única implementación real usada en producción, pero cualquier clase futura que implemente estos tres métodos podría reemplazarla sin tocar `auth.php`.

## Conexión con el resto del sistema

No tiene conexión directa con el backend de IINICIA ni con ningún endpoint HTTP — es puramente un contrato interno de PHP entre `auth.php` y la clase que le inyecten como gestor de llaves (`core_userkey_manager` en el caso real).

## Cosas que no son obvias a primera vista

- Una interfaz vacía como esta puede parecer "código de más" a primera vista para quien nunca ha visto el patrón de inyección de dependencias — pero es justamente lo que permite probar `auth.php` con un doble de prueba (`fake_userkey_manager`, en `tests/`) sin montar base de datos real, y lo que documenta exactamente qué espera `auth.php` de su gestor de llaves sin tener que leer la implementación completa de `core_userkey_manager`.
