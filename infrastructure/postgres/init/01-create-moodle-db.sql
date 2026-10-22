-- El servicio postgres crea automaticamente la base POSTGRES_DB (la del
-- backend IINICIA). Moodle necesita su propia base de datos separada;
-- este script solo corre una vez, cuando el volumen de datos esta vacio.
CREATE DATABASE moodle;
