-- La sincronización de horarios revocó USAGE del esquema privado.
-- La función pública que comprueba Operaciones llama a una función privada;
-- sin este permiso, las lecturas de reservas y borradores fallan con 42501.
-- No se otorgan permisos sobre tablas ni otras funciones privadas.
grant usage on schema private to authenticated;
