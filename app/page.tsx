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

type PredictionChallenge = {
  id: number;
  title: string;
  description: string | null;
  difficulty_level: "easy" | "medium" | "hard" | "legendary" | string;
  closes_at: string;
  challenge_type: string | null;
  rules_json: Record<string, unknown> | null;
  display_order: number | null;
  challenge_matches: {
    match_id: number;
    matches: Match | null;
  }[];
};

type Player = {
  id: number;
  team_name: string;
  player_name: string;
};

type GoalScorers = {
  [key: string]: string;
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
  const [challenges, setChallenges] = useState<PredictionChallenge[]>([]);
  const [scores, setScores] = useState<Scores>({});
  const [goalScorers, setGoalScorers] = useState<GoalScorers>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [rewards, setRewards] = useState<Rewards | null>(null);
const [customerPrizes, setCustomerPrizes] = useState<CustomerPrize[]>([]);
const [showLocationModal, setShowLocationModal] = useState(false);
const [showHowItWorks, setShowHowItWorks] = useState(false);
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
  setChallenges([]);
  setScores({});
  setGoalScorers({});
  setPlayers([]);
  setRewards(null);
  setCustomerPrizes([]);
  setTotalPrizesEarned(0);
  setShowHowItWorks(false);
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

// --- Team name normalization and matching helpers ---
function normalizeTeamName(teamName: string) {
  const normalized = teamName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    "espana": "spain",
    "spain": "spain",
    "congo dr": "dr congo",
    "dr congo": "dr congo",
    "cote d'ivoire": "ivory coast",
    "ivory coast": "ivory coast",
    "ir iran": "iran",
    "iran": "iran",
    "korea republic": "south korea",
    "south korea": "south korea",
    "usa": "united states",
    "u.s.a.": "united states",
    "us": "united states",
    "united states": "united states",
    "united states of america": "united states",
    "curacao": "curacao",
    "turkiye": "turkey",
    "turkey": "turkey",
    "cabo verde": "cape verde",
    "cape verde": "cape verde",
  };

  return aliases[normalized] || normalized;
}

function teamsMatch(playerTeamName: string, matchTeamName: string) {
  return normalizeTeamName(playerTeamName) === normalizeTeamName(matchTeamName);
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

// Helper: Check if customer has already validated daily code today at this location
async function hasDailyCodeValidation(customerIdValue: number) {
  if (!currentLocation) {
    return false;
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("daily_code_validations")
    .select("id")
    .eq("customer_id", customerIdValue)
    .eq("location", currentLocation)
    .eq("code_date", today)
    .maybeSingle();

  if (error) {
    console.log("DAILY CODE VALIDATION LOOKUP ERROR:", error);
    return false;
  }

  return Boolean(data);
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

      const alreadyValidatedToday = await hasDailyCodeValidation(data.id);
      setDailyCodeValidated(alreadyValidatedToday);

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
    setDailyCodeValidated(false);

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

    const todayForValidation = new Date().toISOString().slice(0, 10);

    const { error: validationInsertError } = await supabase
      .from("daily_code_validations")
      .upsert(
        {
          customer_id: customerId,
          location: currentLocation,
          code_date: todayForValidation,
          validated_at: new Date().toISOString(),
        },
        { onConflict: "customer_id,location,code_date" }
      );

    if (validationInsertError) {
      console.log("DAILY CODE VALIDATION INSERT ERROR:", validationInsertError);
      setMessage("Código correcto, pero no se pudo guardar la validación. Intentá de nuevo.");
      return;
    }

    setDailyCodeValidated(true);
    setMessage("");
    await loadMatches(true);
  }

async function loadMatches(skipCodeCheck = false) {
    if (!customerId) {
      setMessage("No se encontró el cliente.");
      return;
    }

    if (!currentLocation) {
      setShowLocationModal(true);
      return;
    }

    if (!dailyCodeValidated && !skipCodeCheck) {
      setMessage("");
      setStep("daily_code");
      return;
    }

    setMessage("Cargando retos de hoy...");

    const now = new Date().toISOString();

    const { data: challengeData, error: challengeError } = await supabase
      .from("prediction_challenges")
      .select(`
        id,
        title,
        description,
        difficulty_level,
        closes_at,
        challenge_type,
        rules_json,
        display_order,
        challenge_matches (
          match_id,
          matches (
            id,
            home_team,
            away_team,
            kickoff_time,
            prediction_deadline,
            status
          )
        )
      `)
      .eq("status", "active")
      .gt("closes_at", now)
      .order("display_order", { ascending: true })
      .order("closes_at", { ascending: true });

    if (challengeError) {
      console.log("CHALLENGES LOAD ERROR:", challengeError);
      setMessage("No se pudieron cargar los retos.");
      return;
    }

    const activeChallenges = (challengeData || []) as unknown as PredictionChallenge[];

    const allMatches = activeChallenges
      .flatMap((challenge) =>
        challenge.challenge_matches
          .map((challengeMatch) => challengeMatch.matches)
          .filter(Boolean)
      ) as Match[];

    const uniqueMatches = Array.from(
      new Map(allMatches.map((match) => [match.id, match])).values()
    );
    const teamNames = Array.from(
      new Set(
        uniqueMatches.flatMap((match) => [match.home_team, match.away_team])
      )
    );

    // Load players team-by-team. This avoids `.in()` edge cases with names that contain spaces.
    if (teamNames.length > 0) {
      const playerResults = await Promise.all(
        teamNames.map((teamName) =>
          supabase
            .from("players")
            .select("id, team_name, player_name")
            .eq("team_name", teamName)
            .order("player_name", { ascending: true })
        )
      );

      const playerErrors = playerResults
        .map((result) => result.error)
        .filter(Boolean);

      if (playerErrors.length > 0) {
        console.log("PLAYERS LOAD ERROR:", playerErrors);
        setPlayers([]);
      } else {
        const combinedPlayers = playerResults.flatMap((result) => result.data || []);
        setPlayers(combinedPlayers as Player[]);
      }
    } else {
      setPlayers([]);
    }

    setChallenges(activeChallenges);
    setMatches(uniqueMatches);
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

  function getGoalScorerKey(challengeId: number, matchId: number) {
    return `${challengeId}-${matchId}`;
  }

  function updateGoalScorer(challengeId: number, matchId: number, value: string) {
    const key = getGoalScorerKey(challengeId, matchId);

    setGoalScorers((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function getPlayersForMatch(match: Match) {
    const homePlayers = players
      .filter((player) => teamsMatch(player.team_name, match.home_team))
      .sort((a, b) => a.player_name.localeCompare(b.player_name));

    const awayPlayers = players
      .filter((player) => teamsMatch(player.team_name, match.away_team))
      .sort((a, b) => a.player_name.localeCompare(b.player_name));

    return {
      homePlayers,
      awayPlayers,
    };
  }

  function challengeNeedsGoalScorer(challenge: PredictionChallenge) {
    return (
      challenge.difficulty_level === "hard" ||
      challenge.difficulty_level === "legendary" ||
      challenge.challenge_type?.includes("scorer")
    );
  }

  function challengeNeedsGoalScorerInEveryMatch(challenge: PredictionChallenge) {
    return challenge.difficulty_level === "legendary";
  }

  function getPredictedWinner(match: Match, homeScore: number, awayScore: number) {
    if (homeScore > awayScore) {
      return match.home_team;
    }

    if (awayScore > homeScore) {
      return match.away_team;
    }

    return "Empate";
  }

  async function savePredictions() {
    if (!customerId) {
      setMessage("No se encontró el cliente.");
      return;
    }

    if (!dailyCodeValidated) {
      setMessage("Validá el código del día antes de guardar tu participación.");
      setStep("daily_code");
      return;
    }

    const completedChallenges = challenges.filter((challenge) =>
      challenge.challenge_matches.every((challengeMatch) => {
        const match = challengeMatch.matches;

        if (!match) {
          return false;
        }

        return scores[match.id]?.home !== "" && scores[match.id]?.away !== "";
      })
    );

    if (completedChallenges.length === 0) {
      setMessage("Completá al menos un reto antes de guardar tu participación.");
      return;
    }

    for (const challenge of completedChallenges) {
      if (!challengeNeedsGoalScorer(challenge)) {
        continue;
      }

      const selectedScorers = challenge.challenge_matches
        .map((challengeMatch) => {
          const match = challengeMatch.matches;
          return match ? goalScorers[getGoalScorerKey(challenge.id, match.id)] : "";
        })
        .filter(Boolean);

      if (challengeNeedsGoalScorerInEveryMatch(challenge)) {
        if (selectedScorers.length !== challenge.challenge_matches.length) {
          setMessage("El reto legendario requiere seleccionar goleador en cada partido.");
          return;
        }
      } else if (selectedScorers.length === 0) {
        setMessage("El reto grande requiere seleccionar al menos un goleador.");
        return;
      }
    }

    setMessage("Guardando participación...");

    const uniqueMatches = Array.from(
      new Map(
        completedChallenges
          .flatMap((challenge) => challenge.challenge_matches)
          .map((challengeMatch) => challengeMatch.matches)
          .filter(Boolean)
          .map((match) => [match!.id, match!])
      ).values()
    ) as Match[];

    for (const match of uniqueMatches) {
      const score = scores[match.id];
      const homeScore = Number(score.home);
      const awayScore = Number(score.away);

      const { error: basePredictionError } = await supabase
        .from("user_match_predictions")
        .upsert(
          {
            customer_id: customerId,
            match_id: match.id,
            predicted_winner: getPredictedWinner(match, homeScore, awayScore),
            predicted_home_score: homeScore,
            predicted_away_score: awayScore,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "customer_id,match_id" }
        );

      if (basePredictionError) {
        console.log("BASE PREDICTION UPSERT ERROR:", basePredictionError);
        setMessage("No se pudo guardar una de tus predicciones base.");
        return;
      }
    }

    for (const challenge of completedChallenges) {
      const { data: entry, error: entryError } = await supabase
        .from("challenge_entries")
        .insert({
          customer_id: customerId,
          challenge_id: challenge.id,
        })
        .select("id")
        .single();

      if (entryError) {
        console.log("CHALLENGE ENTRY INSERT ERROR:", entryError);

        if (entryError.code === "23505") {
          setMessage("Ya participaste en uno de estos retos.");
        } else {
          setMessage("No se pudo guardar tu participación en el reto.");
        }

        return;
      }

      const detailRows = challenge.challenge_matches
        .map((challengeMatch) => {
          const match = challengeMatch.matches;

          if (!match) {
            return null;
          }

          return {
            challenge_entry_id: entry.id,
            match_id: match.id,
            predicted_goal_scorer:
              goalScorers[getGoalScorerKey(challenge.id, match.id)] || null,
            predicted_goal_minute: null,
            extra_prediction: null,
          };
        })
        .filter((row): row is {
          challenge_entry_id: number;
          match_id: number;
          predicted_goal_scorer: string | null;
          predicted_goal_minute: null;
          extra_prediction: null;
        } => row !== null);

      if (detailRows.length > 0) {
        const { error: detailError } = await supabase
          .from("challenge_entry_details")
          .insert(detailRows);

        if (detailError) {
          console.log("CHALLENGE DETAILS INSERT ERROR:", detailError);
          setMessage("Se guardó el reto, pero hubo error guardando sus detalles.");
          return;
        }
      }
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
  <main className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <div className="w-full max-w-md p-8 text-center">
        {step === "phone" && (
          <>
            <div className="flex flex-col items-center mb-6">
  <img
    src="/finca8-logo.png"
    alt="Finca 8"
    className="w-28 h-28 object-contain mb-4"
  />

  <h1 className="text-4xl font-bold text-center">
Golazo Finca 8<br />
<span className="text-xl font-normal text-gray-400"></span>
  </h1>
</div>
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
Golazo Finca 8<br />
<span className="text-xl font-normal text-gray-400">Customer Experience</span>
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
              ⚽ Golazo Finca 8
            </h1>

            <p className="text-xl mb-6">
              Hola, {name || "cliente"}
            </p>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-6">
              <p className="font-bold mb-3">
                🏆 Tus premios
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

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-6">
              <p className="text-sm text-gray-400 mb-1 uppercase tracking-[0.2em]">
                Retos disponibles
              </p>
              <h2 className="text-2xl font-bold mb-3">
                🎯 Participá en más retos
              </h2>
              <p className="text-gray-300 mb-5">
                Elegí un reto de predicción y ganá premios según la dificultad.
              </p>

              <div className="space-y-3">
                <div className="bg-black border border-zinc-700 rounded-lg p-4">
                  <p className="font-bold">🟢 Premio pequeño</p>
                  <p className="text-sm text-gray-400">
                    Acertá el marcador exacto de un partido.
                  </p>
                </div>

                <div className="bg-black border border-zinc-700 rounded-lg p-4">
                  <p className="font-bold">🟡 Premio mediano</p>
                  <p className="text-sm text-gray-400">
                    Acertá el marcador exacto de dos partidos.
                  </p>
                </div>

                <div className="bg-black border border-zinc-700 rounded-lg p-4">
                  <p className="font-bold">🟠 Premio grande</p>
                  <p className="text-sm text-gray-400">
                    Acertá dos marcadores exactos e incluí al menos un goleador.
                  </p>
                </div>

                <div className="bg-black border border-zinc-700 rounded-lg p-4">
                  <p className="font-bold">🔴 Premio legendario</p>
                  <p className="text-sm text-gray-400">
                    Acertá dos marcadores exactos e incluí goleadores en ambos partidos.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-zinc-800">
                <p className="text-xs text-gray-500">
                  📌 Las categorías Pequeño, Mediano, Grande y Legendario representan niveles de dificultad, no reglas fijas. Finca 8 podrá ajustar las condiciones específicas de cada reto según los partidos disponibles, el tipo de evento y los premios aportados por aliados estratégicos.
                </p>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-6">
              <button
                type="button"
                onClick={() => setShowHowItWorks((current) => !current)}
                className="w-full flex items-center justify-between text-left font-bold"
              >
                <span>📌 Cómo funciona</span>
                <span className="text-gray-400">{showHowItWorks ? "−" : "+"}</span>
              </button>

              {showHowItWorks && (
                <div className="space-y-3 text-sm text-gray-300 mt-4">
                  <p>
                    1. Visitá Finca 8, escaneá el QR y pedí la clave del día.
                  </p>
                  <p>
                    2. Elegí uno o varios retos disponibles antes de que cierren.
                  </p>
                  <p>
                    3. Cada reto cierra cuando inicia el primer partido incluido en ese reto.
                  </p>
                  <p>
                    4. Si acertás el reto, ganás el premio correspondiente. No hay sorteo entre ganadores.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => loadMatches()}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              ELEGIR RETO
            </button>

            <button
              onClick={resetToPhone}
              className="w-full mt-3 border border-zinc-600 p-4 rounded-lg font-bold"
            >
              REGRESAR AL INICIO
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
              Pedí la clave del día al personal de Finca 8 para validar tu visita y participar en los retos.
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
              🎯 Retos de hoy
            </h1>

            {challenges.length === 0 && (
              <p className="text-gray-300 mb-6">
                No hay retos abiertos en este momento. Volvé a revisar antes del próximo partido.
              </p>
            )}

            <div className="space-y-4">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-left"
                >
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-[0.2em] mb-1">
                      {challenge.difficulty_level === "easy" && "Premio pequeño"}
                      {challenge.difficulty_level === "medium" && "Premio mediano"}
                      {challenge.difficulty_level === "hard" && "Premio grande"}
                      {challenge.difficulty_level === "legendary" && "Premio legendario"}
                    </p>

                    <p className="font-bold text-xl">
                      {challenge.title}
                    </p>

                    {challenge.description && (
                      <p className="text-sm text-gray-400 mt-1">
                        {challenge.description}
                      </p>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      Cierra: {new Date(challenge.closes_at).toLocaleString("es-HN")}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {challenge.challenge_matches.map((challengeMatch) => {
                      const match = challengeMatch.matches;

                      if (!match) {
                        return null;
                      }

                      return (
                        <div
                          key={`${challenge.id}-${match.id}`}
                          className="bg-black border border-zinc-700 rounded-lg p-4"
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

                          {challengeNeedsGoalScorer(challenge) && (
                            <div className="mt-3">
                              <select
                                value={goalScorers[getGoalScorerKey(challenge.id, match.id)] || ""}
                                onChange={(e) =>
                                  updateGoalScorer(challenge.id, match.id, e.target.value)
                                }
                                className="w-full p-3 rounded-lg bg-white text-black"
                              >
                                <option value="">
                                  {challengeNeedsGoalScorerInEveryMatch(challenge)
                                    ? "Seleccioná goleador"
                                    : "Goleador opcional para este partido"}
                                </option>
                                {(() => {
                                  const { homePlayers, awayPlayers } = getPlayersForMatch(match);

                                  return (
                                    <>
                                      <option disabled>── {match.home_team} ──</option>
                                      {homePlayers.map((player) => (
                                        <option key={player.id} value={player.player_name}>
                                          {player.player_name} — {player.team_name}
                                        </option>
                                      ))}

                                      <option disabled>── {match.away_team} ──</option>
                                      {awayPlayers.map((player) => (
                                        <option key={player.id} value={player.player_name}>
                                          {player.player_name} — {player.team_name}
                                        </option>
                                      ))}
                                    </>
                                  );
                                })()}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {challenges.length > 0 && (
              <button
                onClick={savePredictions}
                className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold mt-6"
              >
                GUARDAR PARTICIPACIÓN
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
              ✅ Participación guardada
            </h1>

            <p className="text-gray-300 mb-6">
              Tu participación fue registrada correctamente.
            </p>

            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 text-left mb-6">
              <p className="mb-3">🎯 Participás en retos de predicción.</p>
              <p className="mb-3">🏆 Si acertás, ganás el premio correspondiente al reto.</p>
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
      {/* Modal for location required */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4">
              ⚽ Participación presencial
            </h2>

            <p className="text-gray-300 mb-6">
              Para participar necesitás visitar cualquiera de nuestros locales, escanear el QR y obtener la clave del día con nuestro personal.
            </p>

            <button
              onClick={() => setShowLocationModal(false)}
              className="w-full bg-red-600 hover:bg-red-700 p-4 rounded-lg font-bold"
            >
              ENTENDIDO
            </button>
          </div>
        </div>
      )}
      <div className="mt-12 flex flex-col items-center gap-8">
        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-[0.2em]">
            Conseguí beneficios en comercios aliados
          </p>

          <img
            src="/Variante BAC Sello50 Blanco (2).png"
            alt="BAC"
            className="w-36 sm:w-44 object-contain opacity-95"
          />
        </div>

        <div className="w-32 h-px bg-zinc-800" />

        <div className="flex flex-col items-center">
          <p className="text-xs text-gray-500 mb-3 uppercase tracking-[0.2em]">
            Experiencia desarrollada por
          </p>

          <img
            src="/tecnomovi-logo.png"
            alt="TecnoMovi"
            className="w-44 object-contain opacity-90"
          />
        </div>
      </div>
    </main>
  );
}
