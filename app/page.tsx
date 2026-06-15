"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  prediction_deadline: string;
  status: string;
};

type Rewards = {
  stamps_count: number;
  final_raffle_entries: number;
};
type CustomerPrize = {
  id: number;
  prize_name: string;
  delivered: boolean;
};
type Scores = {
  [matchId: number]: {
    home: string;
    away: string;
  };
};

export default function Home() {
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
 const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [birthdayDay, setBirthdayDay] = useState("");
const [birthdayMonth, setBirthdayMonth] = useState("");
const [currentLocation, setCurrentLocation] = useState("");
const [dailyCode, setDailyCode] = useState("");
const [dailyCodeValidated, setDailyCodeValidated] = useState(false);
const [consent, setConsent] = useState(true);
  const [message, setMessage] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [rewards, setRewards] = useState<Rewards | null>(null);
const [customerPrizes, setCustomerPrizes] = useState<CustomerPrize[]>([]);
const [totalPrizesEarned, setTotalPrizesEarned] = useState(0);

useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const locationParam = params.get("location");

  if (locationParam === "sanrafael") {
    setCurrentLocation("Finca 8 San Rafael");
  }

  if (locationParam === "ventu") {
    setCurrentLocation("Finca 8 Ventu");
  }
}, []);
function resetToPhone() {
  setStep("phone");
  setPhone("");
  setName("");
  setEmail("");
  setBirthdayDay("");
  setBirthdayMonth("");
  setCurrentLocation("");
  setDailyCode("");
  setDailyCodeValidated(false);
  setConsent(true);

  setMatches([]);
  setScores({});
  setRewards(null);
  setCustomerPrizes([]);
  setTotalPrizesEarned(0);
}

function getCleanHondurasPhone() {
  const digitsOnly = phone.replace(/\D/g, "");

  if (digitsOnly.startsWith("504") && digitsOnly.length === 11) {
    return digitsOnly.slice(3);
  }

  return digitsOnly;
}

function getFormattedHondurasPhone() {
  const cleanPhone = getCleanHondurasPhone();
  return `+504${cleanPhone}`;
}

function getDisplayHondurasPhone() {
  const cleanPhone = getCleanHondurasPhone();

  if (cleanPhone.length <= 4) {
    return cleanPhone;
  }

  return `${cleanPhone.slice(0, 4)}-${cleanPhone.slice(4, 8)}`;
}

  async function loadRewards(customerIdValue: number) {
    const { data, error } = await supabase
      .from("rewards")
      .select("stamps_count, final_raffle_entries")
      .eq("customer_id", customerIdValue)
      .single();

    if (error) {
      console.log("REWARDS LOAD ERROR:", error);
      setRewards(null);
      return;
    }

    setRewards(data);
  }
async function loadCustomerPrizes(customerIdValue: number) {
  const { data: pendingPrizes, error: pendingError } = await supabase
    .from("customer_prizes")
    .select("id, prize_name, delivered")
    .eq("customer_id", customerIdValue)
    .eq("delivered", false);

  if (pendingError) {
    console.log("CUSTOMER PRIZES LOAD ERROR:", pendingError);
    setCustomerPrizes([]);
  } else {
    setCustomerPrizes(pendingPrizes || []);
  }

  const { count, error: countError } = await supabase
    .from("customer_prizes")
    .select("*", { count: "exact", head: true })
    .eq("customer_id", customerIdValue);

  if (countError) {
    console.log("CUSTOMER PRIZES COUNT ERROR:", countError);
    setTotalPrizesEarned(0);
    return;
  }

  setTotalPrizesEarned(count || 0);
}
  async function handleContinue() {
    setMessage("Buscando...");

    const cleanPhone = getCleanHondurasPhone();
    const formattedPhone = getFormattedHondurasPhone();

    if (!cleanPhone) {
      setMessage("Ingresá tu número de WhatsApp.");
      return;
    }

    if (cleanPhone.length !== 8) {
      setMessage("Ingresá un número de Honduras válido de 8 dígitos.");
      return;
    }

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .in("phone", [formattedPhone, cleanPhone, `504${cleanPhone}`])
      .single();

    if (error && error.code !== "PGRST116") {
      console.log("CUSTOMER LOOKUP ERROR:", error);
      setMessage("Hubo un error buscando el cliente.");
      return;
    }

    if (data) {
      setCustomerId(data.id);
      setName(data.name || "");
      await loadRewards(data.id);
      await loadCustomerPrizes(data.id);
      setMessage("");
      setStep("profile");
    } else {
      setMessage("");
      setStep("register");
    }
  }

  async function handleRegister() {
    const cleanPhone = getCleanHondurasPhone();
    const formattedPhone = getFormattedHondurasPhone();

    if (!cleanPhone) {
      setMessage("Ingresá tu número de WhatsApp.");
      return;
    }

    if (cleanPhone.length !== 8) {
      setMessage("Ingresá un número de Honduras válido de 8 dígitos.");
      return;
    }

    if (!name.trim()) {
      setMessage("Ingresá tu nombre.");
      return;
    }

    const { data: customer, error } = await supabase
      .from("customers")
      .insert([
        {
  phone: formattedPhone,
  name: name.trim(),
  email: email.trim() || null,
  birthday_day: birthdayDay ? Number(birthdayDay) : null,
  birthday_month: birthdayMonth || null,
  favorite_location: currentLocation || null,
  consent,
},
      ])
      .select()
      .single();

    if (error) {
      console.log("CUSTOMER INSERT ERROR:", error);
      setMessage("No se pudo registrar el cliente.");
      return;
    }

    setCustomerId(customer.id);

    const { error: rewardsError } = await supabase.from("rewards").insert([
      {
        customer_id: customer.id,
        stamps_count: 0,
        final_raffle_entries: 0,
      },
    ]);

    if (rewardsError) {
      console.log("REWARDS INSERT ERROR:", rewardsError);
      setMessage("Cliente creado, pero hubo error creando recompensas.");
      return;
    }

    await loadRewards(customer.id);
    await loadCustomerPrizes(customer.id);

    setMessage("");
    setStep("profile");
  }

  async function validateDailyCode() {
    if (!currentLocation) {
      setMessage("Escaneá el QR del local o seleccioná dónde estás.");
      return;
    }

    if (!dailyCode.trim()) {
      setMessage("Ingresá el código del día.");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("daily_codes")
      .select("code")
      .eq("code_date", today)
      .eq("active", true)
      .single();

    if (error || !data) {
      console.log("DAILY CODE LOAD ERROR:", error);
      setMessage("No hay código activo para hoy. Pedí ayuda al personal.");
      return;
    }

    const expectedCode = data.code.trim().toUpperCase();
    const enteredCode = dailyCode.trim().toUpperCase();

    if (enteredCode !== expectedCode) {
      setMessage("Código incorrecto. Confirmalo con el personal de Finca 8.");
      return;
    }

    setDailyCodeValidated(true);
    setMessage("Código validado. Ya podés hacer tus pronósticos.");
    setStep("profile");
  }

  async function loadMatches() {
    if (!customerId) {
      setMessage("No se encontró el cliente.");
      return;
    }

    if (!currentLocation) {
      setMessage("Para hacer pronósticos, escaneá el QR dentro de Finca 8 o seleccioná el local donde estás.");
      return;
    }

    if (!dailyCodeValidated) {
      setMessage("");
      setStep("daily_code");
      return;
    }

    setMessage("Cargando partidos de hoy...");

    const today = new Date().toISOString().slice(0, 10);

    const { data: todayMatches, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team, away_team, kickoff_time, prediction_deadline, status")
      .eq("match_date", today)
      .eq("status", "scheduled")
      .gt("prediction_deadline", new Date().toISOString())
      .neq("home_team", "TBD")
      .neq("away_team", "TBD")
      .order("kickoff_time", { ascending: true });

    if (matchesError) {
      console.log("MATCHES ERROR:", matchesError);
      setMessage("No se pudieron cargar los partidos.");
      return;
    }

    const matchIds = (todayMatches || []).map((match) => match.id);

    if (matchIds.length === 0) {
      setMatches([]);
      setMessage("");
      setStep("predictions");
      return;
    }

    const { data: existingPredictions, error: predictionsError } = await supabase
      .from("predictions")
      .select("match_id")
      .eq("customer_id", customerId)
      .in("match_id", matchIds);

    if (predictionsError) {
      console.log("EXISTING PREDICTIONS ERROR:", predictionsError);
      setMessage("No se pudieron revisar tus pronósticos anteriores.");
      return;
    }

    const alreadyPredictedMatchIds = new Set(
      (existingPredictions || []).map((prediction) => prediction.match_id)
    );

    const availableMatches = (todayMatches || []).filter(
      (match) => !alreadyPredictedMatchIds.has(match.id)
    );

    setMatches(availableMatches);
    setMessage("");
    setStep("predictions");
  }

  function updateScore(matchId: number, team: "home" | "away", value: string) {
    setScores((current) => ({
      ...current,
      [matchId]: {
        home: current[matchId]?.home || "",
        away: current[matchId]?.away || "",
        [team]: value,
      },
    }));
  }

  async function savePredictions() {
    if (!customerId) {
      setMessage("No se encontró el cliente.");
      return;
    }

    if (!dailyCodeValidated) {
      setMessage("Validá el código del día antes de guardar pronósticos.");
      setStep("daily_code");
      return;
    }

    const rows = Object.entries(scores)
      .filter(([_, score]) => score.home !== "" && score.away !== "")
      .map(([matchId, score]) => ({
        customer_id: customerId,
        match_id: Number(matchId),
        home_score_prediction: Number(score.home),
        away_score_prediction: Number(score.away),
        is_valid: true,
        location: currentLocation || null,
      }));

    if (rows.length === 0) {
      setMessage("Ingresá al menos un pronóstico.");
      return;
    }

    setMessage("Guardando pronósticos...");

    const { error } = await supabase.from("predictions").insert(rows);

    if (error) {
      console.log("PREDICTIONS INSERT ERROR:", error);

      if (error.code === "23505") {
        setMessage("Ya hiciste un pronóstico para uno de estos partidos.");
      } else {
        setMessage("No se pudieron guardar los pronósticos.");
      }

      return;
    }

    setMessage("");
    setStep("predictions_saved");
  }

  const stamps = rewards?.stamps_count || 0;
  const stampsGoal = 5;
  const megaPrizeGoal = 25;
  const cycleRemainder = stamps % stampsGoal;
  const cycleStamps = stamps > 0 && cycleRemainder === 0 ? stampsGoal : cycleRemainder;
  const stampsDisplay =
    "⭐".repeat(Math.min(cycleStamps, stampsGoal)) +
    "☆".repeat(Math.max(stampsGoal - cycleStamps, 0));

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 text-center">
        {step === "phone" && (
          <>
            <h1 className="text-4xl font-bold mb-4">
              ⚽ Mundial 2026 en Finca 8
            </h1>
{currentLocation && (
  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center mb-6">
    <p className="text-sm text-gray-400">
      📍 Participando desde
    </p>

    <p className="font-bold text-lg">
      {currentLocation}
    </p>
  </div>
)}
            <p className="mb-8 text-gray-400">
              Ingresá tu WhatsApp para participar y recibir información de premios, eventos y promociones.
            </p>

            <div className="relative mb-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-bold">
                🇭🇳 +504
              </span>

              <input
                type="tel"
                inputMode="numeric"
                maxLength={9}
                placeholder="XXXX-XXXX"
                value={getDisplayHondurasPhone()}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 8))}
                className="w-full p-4 pl-24 rounded-lg bg-white text-black"
              />
            </div>

            <button
              onClick={handleContinue}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              CONTINUAR
            </button>
          </>
        )}

        {step === "register" && (
          <>
            <h1 className="text-4xl font-bold mb-4">
              ⚽ Mundial 2026 en Finca 8
            </h1>

            <p className="mb-8 text-gray-400">
              Nuevo cliente. Completá tu registro.
            </p>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-left mb-4">
              <p className="text-sm text-gray-400">WhatsApp</p>
              <p className="font-bold">{getFormattedHondurasPhone()}</p>
            </div>

            <input
              type="text"
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 rounded-lg bg-white text-black mb-4"
            />
<input
  type="email"
  placeholder="Email (opcional)"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  className="w-full p-4 rounded-lg bg-white text-black mb-4"
/>

<input
  type="number"
  min="1"
  max="31"
  placeholder="Día de cumpleaños"
  value={birthdayDay}
  onChange={(e) => setBirthdayDay(e.target.value)}
  className="w-full p-4 rounded-lg bg-white text-black mb-4"
/>
            <select
              value={birthdayMonth}
              onChange={(e) => setBirthdayMonth(e.target.value)}
              className="w-full p-4 rounded-lg bg-white text-black mb-4"
            >
              <option value="">Mes de cumpleaños</option>
              <option value="enero">Enero</option>
              <option value="febrero">Febrero</option>
              <option value="marzo">Marzo</option>
              <option value="abril">Abril</option>
              <option value="mayo">Mayo</option>
              <option value="junio">Junio</option>
              <option value="julio">Julio</option>
              <option value="agosto">Agosto</option>
              <option value="septiembre">Septiembre</option>
              <option value="octubre">Octubre</option>
              <option value="noviembre">Noviembre</option>
              <option value="diciembre">Diciembre</option>
            </select>
{currentLocation && (
  <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-left mb-4">
    <p className="text-sm text-gray-400">Ubicación detectada</p>
    <p className="font-bold">{currentLocation}</p>
  </div>
)}

{!currentLocation && (
  <select
    value={currentLocation}
    onChange={(e) => setCurrentLocation(e.target.value)}
    className="w-full p-4 rounded-lg bg-white text-black mb-4"
  >
    <option value="">¿En cuál Finca 8 te encuentras hoy?</option>
    <option value="Finca 8 San Rafael">
      Finca 8 San Rafael
    </option>
    <option value="Finca 8 Ventu">
      Finca 8 Ventu
    </option>
  </select>
)}
            <div className="flex items-start gap-2 mb-6 text-left">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span className="text-sm text-gray-300">
                Acepto recibir promociones, eventos y noticias de Finca 8 por WhatsApp.
              </span>
            </div>

            <button
              onClick={handleRegister}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              REGISTRARME
            </button>

            <button
              onClick={() => setStep("phone")}
              className="w-full mt-3 border border-zinc-600 p-4 rounded-lg font-bold"
            >
              VOLVER
            </button>
          </>
        )}

        {step === "profile" && (
          <>
            <h1 className="text-4xl font-bold mb-3">
              ⚽ Mi Mundial Finca 8
            </h1>

            <p className="text-xl mb-6">
              Hola, {name || "cliente"}
            </p>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-4">
              <p className="font-bold mb-2">Progreso hacia tu próximo premio</p>
              <p className="text-2xl mb-2">{stampsDisplay}</p>
              <p className="text-gray-300 mb-2">
                {cycleStamps} de {stampsGoal} estampas
              </p>
              <p className="text-sm text-gray-400">
                Estampas totales: {stamps}
              </p>
              <p className="text-sm text-gray-400">
                Premios obtenidos: {totalPrizesEarned}
              </p>
              <p className="text-sm text-gray-400">
                Mega premio: {Math.min(stamps, megaPrizeGoal)} de {megaPrizeGoal} estampas
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-4">
              <p className="font-bold mb-2">🏆 Boletos para rifa final</p>
              <p className="text-2xl">
                {rewards?.final_raffle_entries || 0}
              </p>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-6">
              <p className="font-bold mb-2">🎁 Próximo premio</p>
              <p className="text-gray-300">
                {stamps >= 5
                  ? "Premio disponible por validar"
                  : `Te faltan ${5 - stamps} estampas para el Premio 1`}
              </p>
            </div>

            <button
              onClick={loadMatches}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              IR A PRONÓSTICOS
            </button>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mt-4">
              <p className="font-bold mb-3">
                🏆 Premios disponibles
              </p>

              {customerPrizes.length === 0 && (
                <p className="text-gray-300">
                  No tienes premios pendientes por reclamar.
                </p>
              )}

              {customerPrizes.map((prize) => (
                <div
                  key={prize.id}
                  className="bg-black border border-zinc-700 rounded-lg p-4 mb-3"
                >
                  <p className="font-bold">
                    🎁 {prize.prize_name}
                  </p>

                  <p className="text-sm text-gray-400">
                    Reclamar en Finca 8 con el personal.
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={resetToPhone}
              className="w-full mt-3 border border-zinc-600 p-4 rounded-lg font-bold"
            >
              CAMBIAR NÚMERO
            </button>
          </>
        )}

        {step === "daily_code" && (
          <>
            <h1 className="text-3xl font-bold mb-4">
              🔐 Código del día
            </h1>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-left mb-4">
              <p className="text-sm text-gray-400">Ubicación registrada</p>
              <p className="font-bold">{currentLocation || "Sin ubicación"}</p>
            </div>

            <p className="text-gray-400 mb-6">
              Pedí el código del día al personal de Finca 8 para validar tu visita y hacer pronósticos.
            </p>

            <input
              type="text"
              placeholder="Código del día"
              value={dailyCode}
              onChange={(e) => setDailyCode(e.target.value.toUpperCase())}
              className="w-full p-4 rounded-lg bg-white text-black mb-4 uppercase"
            />

            <button
              onClick={validateDailyCode}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              VALIDAR CÓDIGO
            </button>

            <button
              onClick={() => setStep("profile")}
              className="w-full mt-3 border border-zinc-600 p-4 rounded-lg font-bold"
            >
              VOLVER A MI PERFIL
            </button>
          </>
        )}

        {step === "predictions" && (
          <>
            <h1 className="text-3xl font-bold mb-4">
              ⚽ Pronósticos de hoy
            </h1>

            {matches.length === 0 && (
              <p className="text-gray-300 mb-6">
                No hay partidos disponibles para pronóstico en este momento.
              </p>
            )}

            <div className="space-y-4">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-left"
                >
                  <p className="font-bold mb-3">
                    {match.home_team} vs {match.away_team}
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      min="0"
                      placeholder={match.home_team}
                      value={scores[match.id]?.home || ""}
                      onChange={(e) =>
                        updateScore(match.id, "home", e.target.value)
                      }
                      className="p-3 rounded-lg bg-white text-black"
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder={match.away_team}
                      value={scores[match.id]?.away || ""}
                      onChange={(e) =>
                        updateScore(match.id, "away", e.target.value)
                      }
                      className="p-3 rounded-lg bg-white text-black"
                    />
                  </div>
                </div>
              ))}
            </div>

            {matches.length > 0 && (
              <button
                onClick={savePredictions}
                className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold mt-6"
              >
                GUARDAR PRONÓSTICOS
              </button>
            )}

            <button
              onClick={() => setStep("profile")}
              className="w-full mt-3 border border-zinc-600 p-4 rounded-lg font-bold"
            >
              VOLVER A MI PERFIL
            </button>
          </>
        )}

        {step === "predictions_saved" && (
          <>
            <h1 className="text-4xl font-bold mb-6">
              ✅ Pronósticos guardados
            </h1>

            <p className="text-gray-300 mb-6">
              Tus pronósticos fueron registrados correctamente.
            </p>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-6">
              <p className="mb-3">⚽ Participas por premios de marcador.</p>
              <p className="mb-3">🏆 Si aciertas, podrás reclamar premios.</p>
              <p>📍 Ubicación registrada: {currentLocation || "pendiente de validar"}.</p>
            </div>

            <button
              onClick={() => setStep("profile")}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              VOLVER A MI PERFIL
            </button>
          </>
        )}

        {message && (
          <p className="mt-6 text-gray-300">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
