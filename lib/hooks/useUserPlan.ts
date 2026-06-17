'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FREE_PLAN_LIMIT, type Plan } from '@/types'

export interface UserPlanState {
  plan: Plan
  iva: number
  margenMinimo: number
  recetasCount: number
  subRecetasCount: number
  // Crear
  canCreateReceta: boolean
  canCreateSubReceta: boolean
  // Eliminar recetas/sub-recetas (no ingredientes de una receta)
  canDeleteReceta: boolean
  canDeleteSubReceta: boolean
  // Menús
  canCreateMenu: boolean
  // Foto del platillo
  canAddPhoto: boolean
  // Exportar Excel (solo Pro)
  canExportExcel: boolean
  loading: boolean
}

const defaults: UserPlanState = {
  plan: 'free',
  iva: 16,
  margenMinimo: 65,
  recetasCount: 0,
  subRecetasCount: 0,
  canCreateReceta: true,
  canCreateSubReceta: true,
  canDeleteReceta: false,
  canDeleteSubReceta: false,
  canCreateMenu: false,
  canAddPhoto: false,
  canExportExcel: false,
  loading: true,
}

export function useUserPlan() {
  const [state, setState] = useState<UserPlanState>(defaults)
  const supabase = createClient()

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, recetasRes, subRecetasRes] = await Promise.all([
      supabase.from('user_profiles').select('plan, iva_porcentaje, margen_minimo').eq('id', user.id).single(),
      supabase.from('recetas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('sub_recetas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ])

    const plan = (profileRes.data?.plan ?? 'free') as Plan
    const iva = profileRes.data?.iva_porcentaje ?? 16
    const margenMinimo = profileRes.data?.margen_minimo ?? 65
    const recetasCount = recetasRes.count ?? 0
    const subRecetasCount = subRecetasRes.count ?? 0

    const isPaidPlan = plan === 'basic' || plan === 'pro'

    setState({
      plan,
      iva,
      margenMinimo,
      recetasCount,
      subRecetasCount,
      canCreateReceta: isPaidPlan || recetasCount < FREE_PLAN_LIMIT,
      canCreateSubReceta: isPaidPlan || subRecetasCount < FREE_PLAN_LIMIT,
      canDeleteReceta: isPaidPlan,
      canDeleteSubReceta: isPaidPlan,
      canCreateMenu: isPaidPlan,
      canAddPhoto: isPaidPlan,
      canExportExcel: plan === 'pro',
      loading: false,
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { ...state, refresh }
}
