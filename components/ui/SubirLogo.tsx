"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Trash2 } from "lucide-react";

interface SubirLogoProps {
  negocioId: string;
  logoActual?: string | null;
  onLogoActualizado?: (url: string | null) => void;
}

export default function SubirLogo({ negocioId, logoActual, onLogoActualizado }: SubirLogoProps) {
  const [subiendo, setSubiendo] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [preview, setPreview] = useState<string | null>(logoActual || null);

  useEffect(() => {
    if (logoActual) {
      setPreview(logoActual);
    }
  }, [logoActual]);

  const subirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📁 Archivo seleccionado:', file.name, file.type, file.size);

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      alert('❌ Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('❌ La imagen debe ser menor a 2MB');
      return;
    }

    try {
      setSubiendo(true);

      // Generar nombre único
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const fileName = `${negocioId}/${timestamp}.${extension}`;

      console.log('📤 Subiendo archivo:', fileName);

      // Subir a Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('logos-negocios')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('📊 Resultado upload:', { uploadData, uploadError });

      if (uploadError) {
        console.error('❌ Error en upload:', uploadError);
        throw uploadError;
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('logos-negocios')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log('🔗 URL pública:', publicUrl);

      // Guardar URL en tabla negocios
      const { error: updateError } = await supabase
        .from('negocios')
        .update({ logo_url: publicUrl })
        .eq('id', negocioId);

      console.log('💾 Resultado actualización BD:', { updateError });

      if (updateError) {
        console.error('❌ Error actualizando BD:', updateError);
        throw updateError;
      }

      setPreview(publicUrl);
      onLogoActualizado?.(publicUrl);
      alert('✅ Logo actualizado exitosamente');

    } catch (error: any) {
      console.error('❌ Error completo:', error);
      alert(`❌ Error: ${error.message || 'Error al subir el logo'}`);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarLogo = async () => {
    if (!preview) return;

    if (!confirm('¿Estás seguro de eliminar el logo?')) {
      return;
    }

    try {
      setEliminando(true);

      console.log('🗑️ Eliminando logo:', preview);

      // Extraer path del archivo de la URL
      const url = new URL(preview);
      const path = url.pathname.split('/logos-negocios/')[1];

      console.log('📁 Path a eliminar:', path);

      if (path) {
        // Eliminar de Storage
        const { error: deleteError } = await supabase.storage
          .from('logos-negocios')
          .remove([path]);

        if (deleteError) {
          console.error('❌ Error eliminando de storage:', deleteError);
        }
      }

      // Limpiar URL en BD
      const { error: updateError } = await supabase
        .from('negocios')
        .update({ logo_url: null })
        .eq('id', negocioId);

      console.log('💾 Resultado limpieza BD:', { updateError });

      if (updateError) throw updateError;

      setPreview(null);
      onLogoActualizado?.(null);
      alert('✅ Logo eliminado');

    } catch (error: any) {
      console.error('❌ Error eliminando:', error);
      alert(`❌ Error al eliminar: ${error.message}`);
    } finally {
      setEliminando(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-700">Logo del Negocio</h3>

      {/* Preview */}
      {preview ? (
        <div className="space-y-3">
          <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
            <img src={preview} alt="Logo" className="w-full h-full object-contain" />
          </div>
          
          <div className="flex gap-2">
            <label htmlFor="logo-upload-replace">
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
                {subiendo ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>{subiendo ? 'Subiendo...' : 'Cambiar Logo'}</span>
              </div>
            </label>
            <input
              id="logo-upload-replace"
              type="file"
              accept="image/*"
              onChange={subirLogo}
              disabled={subiendo || eliminando}
              className="hidden"
            />

            <Button
              variant="destructive"
              onClick={eliminarLogo}
              disabled={subiendo || eliminando}
            >
              {eliminando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="logo-upload">
            <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-500 transition-colors bg-gray-50 hover:bg-gray-100">
              {subiendo ? (
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Click para subir logo</span>
                </>
              )}
            </div>
          </label>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={subirLogo}
            disabled={subiendo}
            className="hidden"
          />
          <p className="text-xs text-gray-500 mt-2">
            PNG, JPG, WEBP o GIF. Máximo 2MB.
          </p>
        </div>
      )}
    </div>
  );
}