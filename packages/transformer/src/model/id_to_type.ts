export interface ID_To_Type<I, T> {
    id_to_type(id: I) : Promise<T>
}