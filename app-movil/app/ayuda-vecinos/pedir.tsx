/**
 * Vista. F1.1 · Pedir ayuda (continúa la p. 20 del Mockup v4).
 * Categoría (Salud, Compras, Una manito) + qué necesitas (voz o teclado, 140 caracteres, sin enlaces).
 * Al enviar: si falta el celular se pide recién aquí (/perfil/celular); luego pedidos_ayuda.
 * Con `voz=1` (pie «Contar con mi voz» de F1) la pantalla invita a hablar primero.
 */
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { categoriaDisponible, faltaParaEscribir, useEnviarPedido } from "../../src/controladores/useAyudaVecinos";
import { CATEGORIAS_AYUDA_V4, etiquetaCategoriaAyuda, type ValorCategoriaAyuda } from "../../src/modelos/categoriasAyuda";
import type { CategoriaPedido } from "../../src/modelos/tipos";
import { BotonPrincipal } from "../../src/vistas/componentes/BotonPrincipal";
import { CampoConVoz } from "../../src/vistas/componentes/CampoConVoz";
import { ESTILO_CATEGORIA } from "../../src/vistas/componentes/estiloCategoriaAyuda";
import { Ilustracion } from "../../src/vistas/componentes/Ilustracion";
import { Mensaje } from "../../src/vistas/componentes/Mensaje";
import { Opciones } from "../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../src/vistas/componentes/Pantalla";
import { Texto } from "../../src/vistas/componentes/Texto";

const DISPONIBLES = CATEGORIAS_AYUDA_V4.filter((c) => c.disponibleEnBase).map((c) => ({
  valor: c.valor as CategoriaPedido,
  etiqueta: c.etiqueta,
  icono: ESTILO_CATEGORIA[c.valor].icono,
  color: ESTILO_CATEGORIA[c.valor].color,
}));

export default function PedirAyuda() {
  const params = useLocalSearchParams<{ categoria?: string; voz?: string }>();
  const inicial = params.categoria as ValorCategoriaAyuda | undefined;
  const [categoria, setCategoria] = useState<CategoriaPedido | null>(inicial && categoriaDisponible(inicial) ? inicial : null);
  const [descripcion, setDescripcion] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const pedido = useEnviarPedido();
  const esperaCelular = useRef(false);
  const enviarRef = useRef<() => Promise<void>>(async () => {});

  const enviar = useCallback(async () => {
    if (!categoria) return;
    setAviso(null);
    const falta = await faltaParaEscribir();
    if (falta === "celular") {
      esperaCelular.current = true;
      router.push("/perfil/celular");
      return;
    }
    if (falta === "registro") {
      setAviso("Primero marca dónde vives: Mis datos › Mi dirección.");
      return;
    }
    try {
      await pedido.enviar({ categoria, descripcion });
    } catch {
      // El mensaje se muestra con pedido.error.
    }
  }, [categoria, descripcion, pedido]);

  enviarRef.current = enviar;

  // Al volver de /perfil/celular con el número guardado, se envía solo. El efecto solo depende del
  // foco (refs), así no se dispara antes de salir de la pantalla.
  useFocusEffect(
    useCallback(() => {
      if (!esperaCelular.current) return;
      esperaCelular.current = false;
      void faltaParaEscribir().then((falta) => {
        if (falta === null) void enviarRef.current();
      });
    }, []),
  );

  if (pedido.enviado && categoria) {
    return (
      <Pantalla
        titulo="¡Pedido enviado!"
        textoEscuchar="Pedido enviado. Lo verán tus vecinos del barrio. Si alguien te ayuda, te llamará a tu celular."
        pie={
          <BotonPrincipal variante="tocar" icono="home-outline" onPress={() => router.dismissTo("/principal")}>
            Volver al inicio
          </BotonPrincipal>
        }
      >
        <Ilustracion tipo="listo" />
        <Mensaje tono="listo">{`Tu pedido de ${etiquetaCategoriaAyuda(categoria)} ya lo ven tus vecinos del barrio.`}</Mensaje>
        <Texto>Si alguien puede ayudarte, te llamará a tu celular. Nunca des dinero ni claves por adelantado.</Texto>
      </Pantalla>
    );
  }

  const motivo = !categoria ? "Elige en qué necesitas ayuda" : descripcion.trim().length < 3 ? "Cuéntanos qué necesitas" : null;

  return (
    <Pantalla
      titulo="Pedir ayuda"
      volver
      textoEscuchar="Pedir ayuda. Elige salud, compras o una manito, y cuéntanos qué necesitas con tu voz o escribiendo. Luego toca Enviar a mis vecinos."
      pie={
        <BotonPrincipal variante="listo" icono="send" cargando={pedido.enviando} motivoDesactivado={motivo} onPress={() => void enviar()}>
          Enviar a mis vecinos
        </BotonPrincipal>
      }
    >
      <Texto variante="etiqueta">¿En qué necesitas ayuda?</Texto>
      <Opciones
        nombre="¿En qué necesitas ayuda?"
        tarjetas
        columnas={3}
        opciones={DISPONIBLES}
        seleccion={categoria ? [categoria] : []}
        onCambiar={(sel) => {
          pedido.reiniciar();
          setCategoria(sel[0] ?? null);
        }}
      />
      {categoria === "salud" ? <Mensaje tono="aviso">No escribas diagnósticos ni medicinas.</Mensaje> : null}

      {params.voz === "1" && !descripcion ? (
        <Mensaje tono="info">Toca el micrófono y cuéntanos qué necesitas.</Mensaje>
      ) : null}
      <CampoConVoz
        etiqueta="¿Qué necesitas?"
        ayuda="Que alguien me compre pan"
        valor={descripcion}
        onCambiar={(t) => {
          pedido.reiniciar();
          setDescripcion(t);
        }}
        maxLength={140}
        completo={descripcion.trim().length >= 3}
      />
      <Texto variante="ayuda">{`${descripcion.length} de 140 letras · sin enlaces`}</Texto>

      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {pedido.error ? <Mensaje tono="aviso">{pedido.error}</Mensaje> : null}
    </Pantalla>
  );
}
