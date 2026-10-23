/** Si './x.js' no existe, prueba './x.ts' (los imports del proxy usan .js, como pide nodenext). */
export async function resolve(especificador, contexto, siguiente) {
  try {
    return await siguiente(especificador, contexto);
  } catch (error) {
    if (error?.code === 'ERR_MODULE_NOT_FOUND' && especificador.startsWith('.') && especificador.endsWith('.js')) {
      return siguiente(`${especificador.slice(0, -3)}.ts`, contexto);
    }
    throw error;
  }
}
