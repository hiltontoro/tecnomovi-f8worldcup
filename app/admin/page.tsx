"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
 const [matches, setMatches] = useState<any[]>([]);
const [pendingPrizes, setPendingPrizes] = useState<any[]>([]);
const [dashboardStats, setDashboardStats] = useState({
  customersCount: 0,
  predictionsCount: 0,
  visitsCount: 0,
  pendingPrizesCount: 0,
  deliveredPrizesCount: 0,
  sanRafaelCustomersCount: 0,
  ventuCustomersCount: 0,
  birthdayMonthCustomersCount: 0,
  todayCode: "Sin código",
  tomorrowCode: "Sin código",
  topCustomerName: "Sin datos",
  topCustomerStamps: 0,
  topCustomerRaffleEntries: 0,
});
const [topCustomers, setTopCustomers] = useState<any[]>([]);
const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
const [customersList, setCustomersList] = useState<any[]>([]);
const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
const [activeTab, setActiveTab] = useState<"dashboard" | "customers" | "manual" | "history" | "automatic" | "prizes">("dashboard");

  const finishedMatches = matches.filter((match) => isMatchClosed(match));
  const pendingMatches = matches.filter((match) => !isMatchClosed(match));

  const groupedMatches = pendingMatches.reduce((groups: Record<string, any[]>, match) => {
    const date = match.match_date || "Sin fecha";

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(match);
    return groups;
  }, {});

  const groupedFinishedMatches = finishedMatches.reduce((groups: Record<string, any[]>, match) => {
    const date = match.match_date || "Sin fecha";

    if (!groups[date]) {
      groups[date] = [];
    }

    groups[date].push(match);
    return groups;
  }, {});

  useEffect(() => {
  loadDashboardStats();
  loadMatches();
  loadPendingPrizes();
  loadCustomersList();
}, []);
  async function loadMatches() {
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_date", { ascending: true });

    if (error) {
      console.log("MATCHES LOAD ERROR:", error);
      return;
    }

    setMatches(data || []);
  }

async function loadDashboardStats() {
  const { count: customersCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: predictionsCount } = await supabase
    .from("predictions")
    .select("*", { count: "exact", head: true });

  const { count: visitsCount } = await supabase
    .from("visits")
    .select("*", { count: "exact", head: true });

  const { count: pendingPrizesCount } = await supabase
    .from("customer_prizes")
    .select("*", { count: "exact", head: true })
    .eq("delivered", false);
const { count: deliveredPrizesCount } = await supabase
  .from("customer_prizes")
  .select("*", { count: "exact", head: true })
  .eq("delivered", true);

const { count: sanRafaelCustomersCount } = await supabase
  .from("customers")
  .select("*", { count: "exact", head: true })
  .eq("favorite_location", "Finca 8 San Rafael");

const { count: ventuCustomersCount } = await supabase
  .from("customers")
  .select("*", { count: "exact", head: true })
  .eq("favorite_location", "Finca 8 Ventu");

const currentMonth = getCurrentMonthName();

const { count: birthdayMonthCustomersCount } = await supabase
  .from("customers")
  .select("*", { count: "exact", head: true })
  .eq("birthday_month", currentMonth);

const todayDate = getLocalDateString(0);
const tomorrowDate = getLocalDateString(1);

const { data: todayCodeData } = await supabase
  .from("daily_codes")
  .select("code")
  .eq("code_date", todayDate)
  .eq("active", true)
  .single();

const { data: tomorrowCodeData } = await supabase
  .from("daily_codes")
  .select("code")
  .eq("code_date", tomorrowDate)
  .eq("active", true)
  .single();
  const { data: topRewards } = await supabase
    .from("rewards")
    .select(`
      stamps_count,
      final_raffle_entries,
      customers (
        name,
        phone
      )
    `)
    .order("final_raffle_entries", { ascending: false })
    .limit(5);

  const { data: latestCustomers } = await supabase
    .from("customers")
.select("id, name, phone, email, birthday_day, birthday_month, favorite_location, consent, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  setTopCustomers(topRewards || []);
  setRecentCustomers(latestCustomers || []);

  const topCustomer = topRewards?.[0];
  const topCustomerData = Array.isArray(topCustomer?.customers)
    ? topCustomer?.customers[0]
    : topCustomer?.customers;

  setDashboardStats({
  customersCount: customersCount || 0,
  predictionsCount: predictionsCount || 0,
  visitsCount: visitsCount || 0,
  pendingPrizesCount: pendingPrizesCount || 0,
  deliveredPrizesCount: deliveredPrizesCount || 0,
  sanRafaelCustomersCount: sanRafaelCustomersCount || 0,
  ventuCustomersCount: ventuCustomersCount || 0,
  birthdayMonthCustomersCount: birthdayMonthCustomersCount || 0,
  todayCode: todayCodeData?.code || "Sin código",
  tomorrowCode: tomorrowCodeData?.code || "Sin código",
  topCustomerName: topCustomerData?.name || "Sin datos",
  topCustomerStamps: topCustomer?.stamps_count || 0,
  topCustomerRaffleEntries: topCustomer?.final_raffle_entries || 0,
});
}
async function loadPendingPrizes() {
  const { data, error } = await supabase
    .from("customer_prizes")
    .select(`
      id,
      prize_name,
      delivered,
      delivered_at,
      customers (
        name,
        phone
      )
    `)
    .eq("delivered", false)
    .order("id", { ascending: true });

  if (error) {
    console.log("PENDING PRIZES LOAD ERROR:", error);
    setPendingPrizes([]);
    return;
  }

  setPendingPrizes(data || []);
}

async function loadCustomersList() {
  const { data, error } = await supabase
    .from("customers")
.select("id, name, phone, email, birthday_day, birthday_month, favorite_location, consent, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("CUSTOMERS LIST LOAD ERROR:", error);
    setCustomersList([]);
    return;
  }

  setCustomersList(data || []);
}

async function loadCustomerDetail(customerId: number) {
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, phone, email, birthday_day, birthday_month, favorite_location, consent, created_at")
    .eq("id", customerId)
    .single();

  const { data: rewards } = await supabase
    .from("rewards")
    .select("stamps_count, final_raffle_entries")
    .eq("customer_id", customerId)
    .single();

  const { data: predictions } = await supabase
    .from("predictions")
    .select(`
      id,
      home_score_prediction,
      away_score_prediction,
      is_correct,
      points_awarded,
      matches (
        home_team,
        away_team,
        match_date,
        home_score_actual,
        away_score_actual
      )
    `)
    .eq("customer_id", customerId)
    .order("id", { ascending: false });

  const { data: visits } = await supabase
    .from("visits")
    .select("id, visit_date, location, stamp_awarded")
    .eq("customer_id", customerId)
    .order("visit_date", { ascending: false });

  const { data: prizes } = await supabase
    .from("customer_prizes")
    .select("id, prize_name, delivered, delivered_at")
    .eq("customer_id", customerId)
    .order("id", { ascending: false });

  setSelectedCustomerDetail({
    customer,
    rewards,
    predictions: predictions || [],
    visits: visits || [],
    prizes: prizes || [],
  });
}

async function markPrizeDelivered(prizeId: number) {
  const { error } = await supabase
    .from("customer_prizes")
    .update({
      delivered: true,
      delivered_at: new Date().toISOString(),
    })
    .eq("id", prizeId);

  if (error) {
    console.log("PRIZE DELIVERY ERROR:", error);
    alert("No se pudo marcar el premio como entregado.");
    return;
  }

  alert("Premio marcado como entregado");

  await loadPendingPrizes();
  await loadDashboardStats();
}
  async function saveResult(
    id: number,
    homeScore: number,
    awayScore: number
  ) {
    const { error: matchError } = await supabase
      .from("matches")
      .update({
        home_score_actual: homeScore,
        away_score_actual: awayScore,
        is_finished: true,
      })
      .eq("id", id);

    if (matchError) {
      console.log("MATCH UPDATE ERROR:", matchError);
      alert("No se pudo guardar el resultado.");
      return;
    }

    const { data: predictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("id, customer_id, home_score_prediction, away_score_prediction, points_awarded")
      .eq("match_id", id);

    if (predictionsError) {
      console.log("PREDICTIONS LOAD ERROR:", predictionsError);
      alert("Resultado guardado, pero no se pudieron revisar los pronósticos.");
      await loadMatches();
      return;
    }

    for (const prediction of predictions || []) {
      const points = calculatePoints(
        prediction.home_score_prediction,
        prediction.away_score_prediction,
        homeScore,
        awayScore
      );

      const previousPoints = prediction.points_awarded || 0;
      const pointsDelta = points - previousPoints;

      const { error: predictionUpdateError } = await supabase
        .from("predictions")
        .update({
          is_correct: points > 0,
          points_awarded: points,
        })
        .eq("id", prediction.id);

      if (predictionUpdateError) {
        console.log("PREDICTION UPDATE ERROR:", predictionUpdateError);
      }

      if (pointsDelta !== 0) {
        const { data: reward, error: rewardLoadError } = await supabase
          .from("rewards")
          .select("final_raffle_entries")
          .eq("customer_id", prediction.customer_id)
          .single();

        if (rewardLoadError) {
          console.log("REWARD LOAD ERROR:", rewardLoadError);
          continue;
        }

        const currentEntries = reward?.final_raffle_entries || 0;
        const nextEntries = Math.max(currentEntries + pointsDelta, 0);

        const { error: rewardUpdateError } = await supabase
          .from("rewards")
          .update({
            final_raffle_entries: nextEntries,
          })
          .eq("customer_id", prediction.customer_id);

        if (rewardUpdateError) {
          console.log("REWARD UPDATE ERROR:", rewardUpdateError);
        }
      }

      if (points === 3) {
        const { error: prizeInsertError } = await supabase
          .from("customer_prizes")
          .insert({
            customer_id: prediction.customer_id,
            prediction_id: prediction.id,
            prize_name: "Premio 1",
            delivered: false,
          });

        if (prizeInsertError && prizeInsertError.code !== "23505") {
          console.log("PRIZE INSERT ERROR:", prizeInsertError);
        }
      }
    }

    alert("Resultado guardado y pronósticos revisados");

    await loadDashboardStats();
    await loadMatches();
    await loadPendingPrizes();
    setActiveTab("history");
  }

  return (
    <main className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8">
        ⚙️ Panel Administrador
      </h1>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "dashboard"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "customers"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Clientes
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "manual"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Resultados manuales
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "history"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Historial
        </button>

        <button
          onClick={() => setActiveTab("automatic")}
          className={`px-5 py-3 rounded-lg font-bold ${
            activeTab === "automatic"
              ? "bg-red-600 text-white"
              : "bg-zinc-800 text-gray-300 border border-zinc-700"
          }`}
        >
          Resultados automáticos
        </button>
        <button
  onClick={() => setActiveTab("prizes")}
  className={`px-5 py-3 rounded-lg font-bold ${
    activeTab === "prizes"
      ? "bg-red-600 text-white"
      : "bg-zinc-800 text-gray-300 border border-zinc-700"
  }`}
>
  Premios pendientes
</button>
      </div>
      {activeTab === "dashboard" && (
        <div className="space-y-6 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Clientes registrados</p>
              <p className="text-4xl font-bold">{dashboardStats.customersCount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Pronósticos guardados</p>
              <p className="text-4xl font-bold">{dashboardStats.predictionsCount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Visitas registradas</p>
              <p className="text-4xl font-bold">{dashboardStats.visitsCount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Premios pendientes</p>
              <p className="text-4xl font-bold">{dashboardStats.pendingPrizesCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Código de hoy</p>
              <p className="text-3xl font-bold">{dashboardStats.todayCode}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Código de mañana</p>
              <p className="text-3xl font-bold">{dashboardStats.tomorrowCode}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Premios entregados</p>
              <p className="text-4xl font-bold">{dashboardStats.deliveredPrizesCount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Cumpleaños del mes</p>
              <p className="text-4xl font-bold">{dashboardStats.birthdayMonthCustomersCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Clientes San Rafael</p>
              <p className="text-4xl font-bold">{dashboardStats.sanRafaelCustomersCount}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <p className="text-gray-400 mb-2">Clientes Ventu</p>
              <p className="text-4xl font-bold">{dashboardStats.ventuCustomersCount}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">🏆 Cliente líder</h2>
              <p className="text-xl mb-2">{dashboardStats.topCustomerName}</p>
              <p className="text-gray-300">
                ⭐ {dashboardStats.topCustomerStamps} estampas · 🎟️ {dashboardStats.topCustomerRaffleEntries} boletos
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">📋 Resumen operativo</h2>
              <p className="text-gray-300 mb-2">
                Clientes activos en base: {dashboardStats.customersCount}
              </p>
              <p className="text-gray-300 mb-2">
                Promedio de pronósticos por cliente: {dashboardStats.customersCount > 0 ? (dashboardStats.predictionsCount / dashboardStats.customersCount).toFixed(1) : "0"}
              </p>
              <p className="text-gray-300">
                Premios esperando entrega: {dashboardStats.pendingPrizesCount}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">🥇 Top clientes</h2>

              {topCustomers.length === 0 && (
                <p className="text-gray-300">Todavía no hay ranking.</p>
              )}

              <div className="space-y-3">
                {topCustomers.map((reward, index) => {
                  const customerData = Array.isArray(reward.customers)
                    ? reward.customers[0]
                    : reward.customers;

                  return (
                    <div
                      key={index}
                      className="flex items-center justify-between border-b border-zinc-800 pb-3"
                    >
                      <div>
                        <p className="font-bold">
                          {index + 1}. {customerData?.name || "Sin nombre"}
                        </p>
                        <p className="text-sm text-gray-400">
                          {customerData?.phone || "Sin teléfono"}
                        </p>
                      </div>

                      <p className="text-gray-300">
                        ⭐ {reward.stamps_count || 0} · 🎟️ {reward.final_raffle_entries || 0}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">🆕 Clientes recientes</h2>

              {recentCustomers.length === 0 && (
                <p className="text-gray-300">Todavía no hay clientes recientes.</p>
              )}

              <div className="space-y-3">
                {recentCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="border-b border-zinc-800 pb-3"
                  >
                    <p className="font-bold">{customer.name || "Sin nombre"}</p>
                    <p className="text-sm text-gray-400">
                      {customer.phone || "Sin teléfono"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Cumpleaños: {customer.birthday_month || "Sin dato"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "customers" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">👥 Clientes</h2>

            {customersList.length === 0 && (
              <p className="text-gray-300">Todavía no hay clientes registrados.</p>
            )}

            <div className="space-y-3">
              {customersList.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => loadCustomerDetail(customer.id)}
                  className="w-full text-left bg-black border border-zinc-700 rounded-lg p-4 hover:border-red-600"
                >
                  <p className="font-bold">{customer.name || "Sin nombre"}</p>
                  <p className="text-sm text-gray-400">WhatsApp: {customer.phone || "Sin teléfono"}</p>
                  <p className="text-sm text-gray-400">Email: {customer.email || "Sin email"}</p>
                  <p className="text-sm text-gray-500">
                    Cumpleaños: {customer.birthday_day || "--"} de {customer.birthday_month || "--"}
                  </p>
                  <p className="text-sm text-gray-500">
                    Local: {customer.favorite_location || "Sin dato"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">📋 Historial del cliente</h2>

            {!selectedCustomerDetail && (
              <p className="text-gray-300">Seleccioná un cliente para ver su historial.</p>
            )}

            {selectedCustomerDetail && (
              <div className="space-y-6">
                <div>
                  <p className="text-xl font-bold">{selectedCustomerDetail.customer?.name || "Sin nombre"}</p>
                  <p className="text-gray-400">WhatsApp: {selectedCustomerDetail.customer?.phone || "Sin teléfono"}</p>
                  <p className="text-gray-400">Email: {selectedCustomerDetail.customer?.email || "Sin email"}</p>
                  <p className="text-gray-400">
                    Cumpleaños: {selectedCustomerDetail.customer?.birthday_day || "--"} de {selectedCustomerDetail.customer?.birthday_month || "--"}
                  </p>
                  <p className="text-gray-400">
                    Local: {selectedCustomerDetail.customer?.favorite_location || "Sin dato"}
                  </p>
                  <p className="text-gray-400">
                    Consentimiento: {selectedCustomerDetail.customer?.consent ? "Sí" : "No"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black border border-zinc-700 rounded-lg p-4">
                    <p className="text-gray-400">Estampas</p>
                    <p className="text-3xl font-bold">{selectedCustomerDetail.rewards?.stamps_count || 0}</p>
                  </div>

                  <div className="bg-black border border-zinc-700 rounded-lg p-4">
                    <p className="text-gray-400">Boletos</p>
                    <p className="text-3xl font-bold">{selectedCustomerDetail.rewards?.final_raffle_entries || 0}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">⚽ Pronósticos</h3>
                  {selectedCustomerDetail.predictions.length === 0 && (
                    <p className="text-gray-400">Sin pronósticos.</p>
                  )}
                  <div className="space-y-2">
                    {selectedCustomerDetail.predictions.map((prediction: any) => (
                      <div key={prediction.id} className="bg-black border border-zinc-700 rounded-lg p-3">
                        <p className="font-bold">
                          {prediction.matches?.home_team} vs {prediction.matches?.away_team}
                        </p>
                        <p className="text-sm text-gray-400">
                          Pronóstico: {prediction.home_score_prediction}-{prediction.away_score_prediction}
                        </p>
                        <p className="text-sm text-gray-400">
                          Resultado: {prediction.matches?.home_score_actual ?? "-"}-{prediction.matches?.away_score_actual ?? "-"}
                        </p>
                        <p className="text-sm text-gray-400">
                          Puntos: {prediction.points_awarded || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">🎁 Premios</h3>
                  {selectedCustomerDetail.prizes.length === 0 && (
                    <p className="text-gray-400">Sin premios.</p>
                  )}
                  <div className="space-y-2">
                    {selectedCustomerDetail.prizes.map((prize: any) => (
                      <div key={prize.id} className="bg-black border border-zinc-700 rounded-lg p-3">
                        <p className="font-bold">{prize.prize_name}</p>
                        <p className="text-sm text-gray-400">
                          Estado: {prize.delivered ? "Entregado" : "Pendiente"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold mb-2">📍 Visitas</h3>
                  {selectedCustomerDetail.visits.length === 0 && (
                    <p className="text-gray-400">Sin visitas registradas.</p>
                  )}
                  <div className="space-y-2">
                    {selectedCustomerDetail.visits.map((visit: any) => (
                      <div key={visit.id} className="bg-black border border-zinc-700 rounded-lg p-3">
                        <p>{visit.visit_date}</p>
                        <p className="text-sm text-gray-400">{visit.location || "Sin ubicación"}</p>
                        <p className="text-sm text-gray-400">
                          Estampa: {visit.stamp_awarded ? "Sí" : "No"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "manual" && (
        <div className="space-y-10">
          {pendingMatches.length === 0 && (
            <p className="text-gray-300">
              No hay partidos pendientes para ingresar resultados.
            </p>
          )}

          {Object.entries(groupedMatches).map(([date, matchesForDate]) => (
            <section key={date}>
              <h2 className="text-2xl font-bold mb-4 border-b border-zinc-700 pb-2">
                {formatDate(date)}
              </h2>

              <div className="space-y-6">
                {matchesForDate.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onSave={saveResult}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-10">
          {finishedMatches.length === 0 && (
            <p className="text-gray-300">
              Todavía no hay resultados guardados.
            </p>
          )}

          {Object.entries(groupedFinishedMatches).map(([date, matchesForDate]) => (
            <section key={date}>
              <h2 className="text-2xl font-bold mb-4 border-b border-zinc-700 pb-2">
                {formatDate(date)}
              </h2>

              <div className="space-y-6">
                {matchesForDate.map((match) => (
                  <FinishedMatchCard
                    key={match.id}
                    match={match}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {activeTab === "automatic" && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-3xl">
          <h2 className="text-2xl font-bold mb-4">
            🤖 Resultados automáticos
          </h2>

          <p className="text-gray-300 mb-4">
            Esta sección queda reservada para conectar una API deportiva que actualice resultados automáticamente.
          </p>

          <div className="bg-black border border-zinc-700 rounded-lg p-4 text-left mb-6">
            <p className="font-bold mb-3">Flujo propuesto:</p>
            <p className="mb-2">1. Consultar API externa del Mundial.</p>
            <p className="mb-2">2. Actualizar resultados en la tabla matches.</p>
            <p className="mb-2">3. Marcar partidos como finalizados.</p>
            <p className="mb-2">4. Calcular aciertos en predictions.</p>
            <p>5. Generar puntos, boletos y premios.</p>
          </div>

          <button
            disabled
            className="w-full bg-zinc-700 text-gray-400 p-4 rounded-lg font-bold cursor-not-allowed"
          >
            CONECTAR API DE RESULTADOS — PRÓXIMA FASE
          </button>
        </div>
      )}

      {activeTab === "prizes" && (
        <div className="space-y-6 max-w-3xl">
          {pendingPrizes.length === 0 && (
            <p className="text-gray-300">
              No hay premios pendientes por entregar.
            </p>
          )}

          {pendingPrizes.map((prize) => (
            <div
              key={prize.id}
              className="bg-zinc-900 border border-zinc-700 rounded-xl p-6"
            >
              <h2 className="text-2xl font-bold mb-2">
                🎁 {prize.prize_name}
              </h2>

              <p className="text-gray-300 mb-2">
                Cliente: {prize.customers?.name || "Sin nombre"}
              </p>

              <p className="text-gray-300 mb-6">
                WhatsApp: {prize.customers?.phone || "Sin teléfono"}
              </p>

              <button
                onClick={() => markPrizeDelivered(prize.id)}
                className="bg-red-600 hover:bg-red-700 p-3 rounded font-bold"
              >
                Marcar entregado
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function MatchCard({
  match,
  onSave,
}: {
  match: any;
  onSave: (
    id: number,
    homeScore: number,
    awayScore: number
  ) => void;
}) {
  const [homeScore, setHomeScore] = useState(match.home_score_actual ?? 0);
  const [awayScore, setAwayScore] = useState(match.away_score_actual ?? 0);

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-4">
        {match.home_team} vs {match.away_team}
      </h2>

      <div className="flex gap-4 mb-4">
        <input
          type="number"
          value={homeScore}
          onChange={(e) => setHomeScore(Number(e.target.value))}
          className="bg-white text-black p-3 rounded w-24"
        />

        <input
          type="number"
          value={awayScore}
          onChange={(e) => setAwayScore(Number(e.target.value))}
          className="bg-white text-black p-3 rounded w-24"
        />
      </div>

      <button
        onClick={() => onSave(match.id, homeScore, awayScore)}
        className="bg-red-600 hover:bg-red-700 p-3 rounded font-bold"
      >
        Guardar resultado
      </button>
    </div>
  );
}

function FinishedMatchCard({ match }: { match: any }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 opacity-90">
      <h2 className="text-2xl font-bold mb-2">
        {match.home_team} vs {match.away_team}
      </h2>

      <p className="text-gray-300 mb-4">
        Resultado final guardado
      </p>

      <div className="flex gap-4 mb-4">
        <div className="bg-black border border-zinc-700 rounded-lg p-4 w-24 text-center">
          <p className="text-sm text-gray-400">{match.home_team}</p>
          <p className="text-3xl font-bold">{match.home_score_actual}</p>
        </div>

        <div className="bg-black border border-zinc-700 rounded-lg p-4 w-24 text-center">
          <p className="text-sm text-gray-400">{match.away_team}</p>
          <p className="text-3xl font-bold">{match.away_score_actual}</p>
        </div>
      </div>

      <p className="text-sm text-gray-500">
        Este resultado ya fue cerrado. Para modificarlo, se debe hacer desde Supabase o por un administrador técnico.
      </p>
    </div>
  );
}

function formatDate(date: string) {
  if (date === "Sin fecha") {
    return date;
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("es-HN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function calculatePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
) {
  const exactScore = predictedHome === actualHome && predictedAway === actualAway;

  if (exactScore) {
    return 3;
  }

  const predictedOutcome = getOutcome(predictedHome, predictedAway);
  const actualOutcome = getOutcome(actualHome, actualAway);

  if (predictedOutcome === actualOutcome) {
    return 1;
  }

  return 0;
}

function getOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) {
    return "home";
  }

  if (homeScore < awayScore) {
    return "away";
  }

  return "draw";
}

function isMatchClosed(match: any) {
  return (
    match.is_finished === true ||
    (match.home_score_actual !== null &&
      match.home_score_actual !== undefined &&
      match.away_score_actual !== null &&
      match.away_score_actual !== undefined)
  );
}

function getLocalDateString(daysToAdd: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getCurrentMonthName() {
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  return months[new Date().getMonth()];
}