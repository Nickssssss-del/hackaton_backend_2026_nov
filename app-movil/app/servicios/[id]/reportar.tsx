/**
 * Vista. Reportar un negocio con el diseño del Mockup v4 (desde E3).
 * Motivos exactos del CHECK de `reportes`. Una pregunta por pantalla; el envío se confirma en el pie.
 */
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { faltaParaEscribir } from "../../../src/controladores/useAyudaVecinos";
import { useServicios } from "../../../src/controladores/useServicios";
import { MOTIVOS_REPORTE, useReportar } from "../../../src/controladores/useServiciosV4";
import { nombreServicio } from "../../../src/modelos/categoriasServicio";
import type { MotivoReporte } from "../../../src/modelos/tipos";
import { BotonPrincipal } from "../../../src/vistas/componentes/BotonPrincipal";
import { Mensaje } from "../../../src/vistas/componentes/Mensaje";
import { Opciones } from "../../../src/vistas/componentes/Opciones";
import { Pantalla } from "../../../src/vistas/componentes/Pantalla";
import { Texto } from "../../../src/vistas/componentes/Texto";

export default function ReportarNegocio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const servicios = useServicios();
  const servicio = servicios.todos.find((s) => s.id === id);
  const nombre = servicio ? nombreServicio(servicio) : "este negocio";
  const [motivo, setMotivo] = useState<MotivoReporte | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const reporte = useReportar();

  const enviar = async () => {
    if (!id || !motivo) return;
    setAviso(null);
    const falta = await faltaParaEscribir();
    if (falta === "celular") {
      // La base exige el perfil completo para escribir (D-03); al volver se toca otra vez Enviar.
      router.push("/perfil/celular");
      return;
    }
    if (falta === "registro") {
      setAviso("Primero elige tu barrio: Mis datos › Mi barrio.");
      return;
    }
    try {
      await reporte.reportar({ servicioId: id, motivo });
    } catch {
      // El mensaje se muestra con reporte.error.
    }
  };

  if (reporte.hecho) {
    return (
      <Pantalla
        titulo="Recibimos tu reporte"
        textoEscuchar="Recibimos tu reporte. El equipo lo revisará."
        pie={
          <BotonPrincipal variante="tocar" icono="chevron-left" onPress={() => router.back()}>
            Volver
          </BotonPrincipal>
        }
      >
        <Mensaje tono="listo">Gracias. El equipo lo revisará.</Mensaje>
      </Pantalla>
    );
  }

  return (
    <Pantalla
      titulo="¿Qué pasa con este negocio?"
      volver
      textoEscuchar={`Reportar ${nombre}. Elige qué pasa: parece una estafa, datos falsos, es ofensivo, ya no existe u otro motivo. Luego toca Enviar reporte.`}
      pie={
        <BotonPrincipal
          variante="tocar"
          icono="flag-outline"
          cargando={reporte.enviando}
          motivoDesactivado={motivo ? null : "Elige un motivo"}
          onPress={() => void enviar()}
        >
          Enviar reporte
        </BotonPrincipal>
      }
    >
      <Texto variante="subtitulo">{nombre}</Texto>
      <Opciones
        nombre="Motivo del reporte"
        columnas={1}
        opciones={MOTIVOS_REPORTE.map((m) => ({ valor: m.valor, etiqueta: m.etiqueta }))}
        seleccion={motivo ? [motivo] : []}
        onCambiar={(sel) => setMotivo(sel[0] ?? null)}
      />
      <Texto variante="ayuda">Solo lo verá el equipo de Vecinos.</Texto>
      {aviso ? <Mensaje tono="aviso">{aviso}</Mensaje> : null}
      {reporte.error ? <Mensaje tono="aviso">{reporte.error}</Mensaje> : null}
    </Pantalla>
  );
}
