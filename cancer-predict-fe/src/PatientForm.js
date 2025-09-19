import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

/** Hook localStorage đơn giản */
function useLocalStorage(key, initialValue) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);
  return [state, setState];
}

/** Tiện ích chung */
const clamp01 = (x) => Math.max(0, Math.min(0.99, x));
const fmtPct = (p) => `${(Number(p) * 100).toFixed(1)}%`;

export default function PatientForm() {
  const [form, setForm] = useState({
    Age: "",
    Gender: "1", // 0 = Male, 1 = Female
    Height: "",
    Weight: "",
    BMI: "",
    Smoking: "0", // 0 = No, 1 = Yes
    GeneticRisk: "0", // 0..2
    PhysicalActivity: "0", // 0..10
    AlcoholIntake: "0", // 0..5 (thập phân)
    CancerHistory: "0", // 0 = No, 1 = Yes
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastPayload, setLastPayload] = useState(null);
  const [history, setHistory] = useLocalStorage("dss_history", []);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /** BMI theo giới */
  const getBMICategoryByGender = (bmi, gender) => {
    const x = parseFloat(bmi);
    if (isNaN(x)) return { category: "", color: "" };
    if (gender === "0") {
      if (x < 18.5) return { category: "Thiếu cân", color: "text-info" };
      if (x < 24.9) return { category: "Bình thường", color: "text-success" };
      if (x < 29.9) return { category: "Thừa cân", color: "text-warning" };
      return { category: "Béo phì", color: "text-danger" };
    } else {
      if (x < 18.5) return { category: "Thiếu cân", color: "text-info" };
      if (x < 23.9) return { category: "Bình thường", color: "text-success" };
      if (x < 28.9) return { category: "Thừa cân", color: "text-warning" };
      return { category: "Béo phì", color: "text-danger" };
    }
  };

  /** BMI WHO */
  const getWHOCategory = (bmi) => {
    const x = parseFloat(bmi);
    if (isNaN(x)) return { category: "", color: "" };
    if (x < 18.5) return { category: "Underweight (WHO)", color: "text-info" };
    if (x < 25) return { category: "Normal (WHO)", color: "text-success" };
    if (x < 30) return { category: "Overweight (WHO)", color: "text-warning" };
    return { category: "Obesity (WHO)", color: "text-danger" };
  };

  /** Nhóm rủi ro FE (không thay BE) */
  const getRiskTier = (prob) => {
    const p = Number(prob);
    if (!Number.isFinite(p)) {
      return {
        key: "unknown",
        label: "—",
        badge: "secondary",
        bar: "bg-secondary",
        cta: "Không xác định nguy cơ. Vui lòng thử lại.",
      };
    }
    const pct = p * 100;
    if (pct < 5)
      return {
        key: "low",
        label: "Thấp (0–5%)",
        badge: "success",
        bar: "bg-success",
        cta:
          "Nguy cơ thấp. Duy trì lối sống lành mạnh và tầm soát theo khuyến cáo độ tuổi.",
      };
    if (pct < 15)
      return {
        key: "medium",
        label: "Trung bình (5–15%)",
        badge: "info",
        bar: "bg-info",
        cta:
          "Nguy cơ trung bình. Tối ưu vận động, dinh dưỡng; tiếp tục tầm soát định kỳ.",
      };
    if (pct < 30)
      return {
        key: "high",
        label: "Cao (15–30%)",
        badge: "warning",
        bar: "bg-warning",
        cta: "Nguy cơ cao. Nên đặt lịch khám sàng lọc trong 2–4 tuần.",
      };
    if (pct < 70)
      return {
        key: "alert",
        label: "Báo động (30–70%)",
        badge: "danger",
        bar: "bg-danger",
        cta: "Báo động. Đặt lịch tầm soát trong 7–14 ngày và trao đổi với bác sĩ.",
      };
    return {
      key: "danger",
      label: "Nguy hiểm (>70%)",
      badge: "danger",
      bar: "bg-danger",
      cta:
        "Nguy hiểm. Ưu tiên khám trong 48–72 giờ và chuẩn bị hồ sơ y tế liên quan.",
    };
  };

  /** Khuyến nghị tổng quát theo tier */
  const getRecommendation = (p) => {
    const tier = getRiskTier(p);
    return { text: tier.cta, color: tier.badge };
  };

  /** DSS chi tiết theo payload + tier */
  const getDetailedAdvice = (payload, tierKey) => {
    const advices = [];
    if (!payload) return advices;

    if (payload.Smoking === 1) advices.push("🚬 Bỏ thuốc lá hoàn toàn.");
    if (payload.BMI >= 25)
      advices.push("⚖️ Giảm cân, ưu tiên chế độ ăn nhiều rau, hạn chế đường/béo.");
    if (payload.BMI > 0 && payload.BMI < 18.5)
      advices.push("⚖️ BMI thấp, tăng cường dinh dưỡng lành mạnh để đạt cân nặng hợp lý.");
    if (payload.AlcoholIntake > 2)
      advices.push("🍺 Giảm rượu/bia xuống ≤2 đơn vị/tuần hoặc ngưng.");
    if (payload.PhysicalActivity < 3)
      advices.push("🏃 Tập luyện ≥150 phút/tuần (đi bộ nhanh, đạp xe...).");
    if (payload.GeneticRisk === 2)
      advices.push("🧬 Nguy cơ di truyền cao, cân nhắc tư vấn di truyền/tầm soát định kỳ.");
    if (payload.CancerHistory === 1)
      advices.push("🏥 Có tiền sử ung thư, theo dõi sát và khám định kỳ với bác sĩ chuyên khoa.");

    if (["high", "alert", "danger"].includes(tierKey)) {
      advices.push("🗓️ Chuẩn bị sổ sức khỏe, thuốc đang dùng, hồ sơ cũ khi đi khám.");
    }
    if (tierKey === "alert") {
      advices.push("📞 Đặt lịch tầm soát trong 7–14 ngày.");
    }
    if (tierKey === "danger") {
      advices.push("⏱️ Ưu tiên khám trong 48–72 giờ.");
    }

    if (advices.length === 0)
      advices.push("✅ Lối sống hiện tại khá tốt, tiếp tục duy trì.");
    return advices;
  };

  /** Validation đơn giản (FE) */
  const validate = (p) => {
    const errs = [];
    const age = parseInt(p.Age, 10);
    const h = parseFloat(p.Height);
    const w = parseFloat(p.Weight);
    if (!Number.isFinite(age) || age < 18 || age > 100) errs.push("Tuổi nên trong khoảng 18–100.");
    if (!Number.isFinite(h) || h < 100 || h > 250) errs.push("Chiều cao nên trong khoảng 100–250 cm.");
    if (!Number.isFinite(w) || w < 30 || w > 200) errs.push("Cân nặng nên trong khoảng 30–200 kg.");
    if (Number.isFinite(h) && Number.isFinite(w)) {
      const bmi = w / Math.pow(h / 100, 2);
      if (bmi < 12 || bmi > 55) errs.push("BMI bất thường so với dữ liệu huấn luyện điển hình.");
    }
    return errs;
  };

  /** Handlers */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if ((name === "Height" || name === "Weight") && updated.Height && updated.Weight) {
        const h = parseFloat(updated.Height) / 100;
        const w = parseFloat(updated.Weight);
        if (h > 0 && w > 0) {
          updated.BMI = (w / (h * h)).toFixed(1);
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    const payload = {
      Age: parseInt(form.Age, 10),
      Gender: parseInt(form.Gender, 10),
      BMI: parseFloat(form.BMI) || 0,
      Smoking: parseInt(form.Smoking, 10),
      GeneticRisk: parseInt(form.GeneticRisk, 10),
      PhysicalActivity: parseFloat(form.PhysicalActivity) || 0,
      AlcoholIntake: parseFloat(form.AlcoholIntake) || 0,
      CancerHistory: parseInt(form.CancerHistory, 10),
    };

    const errs = validate({ ...form });
    if (errs.length) {
      setResult({ error: true, message: errs.join(" ") });
      return;
    }

    setLoading(true);
    setLastPayload(payload);
    try {
      const res = await axios.post("http://127.0.0.1:8010/predict", payload, {
        headers: { "Content-Type": "application/json" },
      });
      setResult(res.data);

      // Lưu lịch sử local
      const rec = {
        id: Date.now(),
        ts: new Date().toISOString(),
        payload,
        response: res.data,
      };
      setHistory((prev) => [rec, ...prev].slice(0, 200));
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể kết nối backend.";
      setResult({ error: true, message });
    } finally {
      setLoading(false);
    }
  };

  /** Tính thông tin BMI hiển thị */
  const bmiGenderInfo = getBMICategoryByGender(form.BMI, form.Gender);
  const bmiWHOInfo = getWHOCategory(form.BMI);

  /** ======= WHAT-IF SCENARIO ======= */
  const [scenario, setScenario] = useState(null);

  useEffect(() => {
    if (lastPayload && result && !result.error) {
      setScenario({ ...lastPayload });
    }
  }, [lastPayload, result]);

  // Heuristic fallback (FE-only) — giữ để dùng khi offline/lỗi
  const estimateSimulatedProb = (baseProb, s) => {
    if (!s || !Number.isFinite(baseProb)) return null;
    let delta = 0;
    // Smoking
    delta += s.Smoking === 1 ? +0.10 : -0.02;
    // BMI
    if (s.BMI >= 30) delta += +0.08;
    else if (s.BMI >= 25) delta += +0.04;
    else if (s.BMI < 18.5) delta += +0.02;
    // PhysicalActivity
    if (s.PhysicalActivity < 3) delta += +0.05;
    else if (s.PhysicalActivity <= 5) delta += +0.02;
    else if (s.PhysicalActivity > 7) delta += -0.03;
    // Alcohol
    if (s.AlcoholIntake > 3) delta += +0.04;
    else if (s.AlcoholIntake >= 2) delta += +0.02;
    // Genetic
    if (s.GeneticRisk === 1) delta += +0.06;
    if (s.GeneticRisk === 2) delta += +0.12;
    // History
    if (s.CancerHistory === 1) delta += +0.10;
    // Age (minh hoạ)
    if (s.Age >= 60) delta += +0.03;
    else if (s.Age <= 30) delta += -0.01;

    return clamp01(baseProb + delta);
  };

  const baseProb = useMemo(
    () => (result && !result.error ? Number(result.probability_cancer) : null),
    [result]
  );

  // ===== Scenario model-backed (debounce + abort + cache) =====
  const SCENARIO_DEBOUNCE_MS = 400;
  const abortRef = useRef(null);
  const scenCacheRef = useRef(new Map());
  const [scenLoading, setScenLoading] = useState(false);
  const [scenError, setScenError] = useState(null);
  const [scenarioResult, setScenarioResult] = useState(null);

  // Heuristic calc for fallback view
  const simProb = useMemo(
    () => (scenario && baseProb != null ? estimateSimulatedProb(baseProb, scenario) : null),
    [scenario, baseProb]
  );
  const simTier = useMemo(() => (simProb != null ? getRiskTier(simProb) : null), [simProb]);

  useEffect(() => {
    if (!scenario || baseProb == null) return;

    // offline: không gọi model, để rỗng (UI sẽ dùng heuristic)
    if (!online) {
      setScenarioResult(null);
      setScenLoading(false);
      setScenError(null);
      return;
    }

    setScenError(null);
    setScenLoading(true);

    const key = JSON.stringify({
      Age: scenario.Age,
      Gender: scenario.Gender,
      BMI: scenario.BMI,
      Smoking: scenario.Smoking,
      GeneticRisk: scenario.GeneticRisk,
      PhysicalActivity: scenario.PhysicalActivity,
      AlcoholIntake: scenario.AlcoholIntake,
      CancerHistory: scenario.CancerHistory,
    });

    // cache hit
    if (scenCacheRef.current.has(key)) {
      setScenarioResult(scenCacheRef.current.get(key));
      setScenLoading(false);
      return;
    }

    // huỷ request cũ
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await axios.post(
          "http://127.0.0.1:8010/predict",
          {
            Age: Number(scenario.Age ?? lastPayload?.Age ?? 0),
            Gender: Number(scenario.Gender ?? lastPayload?.Gender ?? 0),
            BMI: Number(scenario.BMI ?? lastPayload?.BMI ?? 0),
            Smoking: Number(scenario.Smoking ?? lastPayload?.Smoking ?? 0),
            GeneticRisk: Number(scenario.GeneticRisk ?? lastPayload?.GeneticRisk ?? 0),
            PhysicalActivity: Number(scenario.PhysicalActivity ?? lastPayload?.PhysicalActivity ?? 0),
            AlcoholIntake: Number(scenario.AlcoholIntake ?? lastPayload?.AlcoholIntake ?? 0),
            CancerHistory: Number(scenario.CancerHistory ?? lastPayload?.CancerHistory ?? 0),
          },
          { headers: { "Content-Type": "application/json" }, signal: controller.signal }
        );
        setScenarioResult(res.data);
        scenCacheRef.current.set(key, res.data);
      } catch (e) {
        const canceled = e?.name === "CanceledError" || e?.name === "AbortError" || e?.code === "ERR_CANCELED";
        if (!canceled) {
          setScenError(e?.response?.data?.message || e?.message || "Scenario predict failed.");
          setScenarioResult(null);
        }
      } finally {
        setScenLoading(false);
      }
    }, SCENARIO_DEBOUNCE_MS);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [scenario, baseProb, online, lastPayload]);

  /** Lịch sử: export CSV */
  const exportCsv = () => {
    const rows = [
      [
        "ts",
        "Age",
        "Gender",
        "BMI",
        "Smoking",
        "GeneticRisk",
        "PhysicalActivity",
        "AlcoholIntake",
        "CancerHistory",
        "prediction",
        "probability_cancer",
      ],
      ...history.map((h) => [
        h.ts,
        h.payload.Age,
        h.payload.Gender,
        h.payload.BMI,
        h.payload.Smoking,
        h.payload.GeneticRisk,
        h.payload.PhysicalActivity,
        h.payload.AlcoholIntake,
        h.payload.CancerHistory,
        h.response?.prediction ?? "",
        h.response?.probability_cancer ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeTs = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
    a.download = `dss_history_${safeTs}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Copy JSON của bản ghi mới nhất */
  const copyLastJson = async () => {
    if (!history.length) return;
    const latest = history[0];
    const data = JSON.stringify(latest, null, 2);
    try {
      await navigator.clipboard.writeText(data);
      alert("Đã copy JSON bản ghi gần nhất vào clipboard.");
    } catch {
      alert("Không thể copy vào clipboard.");
    }
  };

  /** Load sample nhanh */
  const loadSample = () => {
    const sample = {
      Age: "50",
      Gender: "1",
      Height: "170",
      Weight: "70",
      BMI: "24.2",
      Smoking: "0",
      GeneticRisk: "2",
      PhysicalActivity: "5.0",
      AlcoholIntake: "2.5",
      CancerHistory: "0",
    };
    setForm(sample);
  };

  /** In/Save-as-PDF */
  const printPage = () => window.print();

  return (
    <div className="min-vh-100 d-flex align-items-start bg-light py-4">
      <div className="container" style={{ maxWidth: 980 }}>
        {!online && (
          <div className="alert alert-warning d-flex align-items-center" role="alert">
            <span className="me-2">⚠️</span>Bạn đang offline. Có thể không gọi được API.
          </div>
        )}

        <div className="d-flex gap-2 flex-wrap mb-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={loadSample}>Load sample</button>
          <button className="btn btn-outline-dark btn-sm" onClick={printPage}>In / Lưu PDF</button>
          <button className="btn btn-outline-primary btn-sm" onClick={exportCsv} disabled={!history.length}>
            Export CSV lịch sử
          </button>
          <button className="btn btn-outline-success btn-sm" onClick={copyLastJson} disabled={!history.length}>
            Copy JSON gần nhất
          </button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => setHistory([])} disabled={!history.length}>
            Xoá lịch sử
          </button>
        </div>

        <div className="card shadow-sm border-0 rounded-4">
          <div className="card-body p-4 p-md-5">
            <h3 className="text-center fw-bold mb-4">🧬 Cancer Risk DSS</h3>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="row g-4" noValidate>
              {/* Age - Height - Weight - BMI */}
              <div className="col-md-3">
                <label htmlFor="age" className="form-label">Tuổi</label>
                <input id="age" type="number" name="Age" value={form.Age} onChange={handleChange}
                       className="form-control rounded-3" required min="18" max="100" />
              </div>

              <div className="col-md-3">
                <label htmlFor="height" className="form-label">Chiều cao (cm)</label>
                <input id="height" type="number" name="Height" value={form.Height} onChange={handleChange}
                       className="form-control rounded-3" required min="100" max="250" step="0.1" />
              </div>

              <div className="col-md-3">
                <label htmlFor="weight" className="form-label">Cân nặng (kg)</label>
                <input id="weight" type="number" name="Weight" value={form.Weight} onChange={handleChange}
                       className="form-control rounded-3" required min="30" max="200" step="0.1" />
              </div>

              <div className="col-md-3">
                <label className="form-label">BMI</label>
                <input type="text" className={`form-control rounded-3 fw-bold ${bmiGenderInfo.color}`}
                       value={form.BMI} readOnly />
                <small className={`${bmiWHOInfo.color}`}>{bmiWHOInfo.category}</small>
              </div>

              {/* Gender */}
              <div className="col-12">
                <label className="form-label d-block">Giới tính</label>
                <div className="d-flex gap-3">
                  <label className="form-check">
                    <input type="radio" name="Gender" value="0" checked={form.Gender === "0"}
                           onChange={handleChange} className="form-check-input" />
                    Nam
                  </label>
                  <label className="form-check">
                    <input type="radio" name="Gender" value="1" checked={form.Gender === "1"}
                           onChange={handleChange} className="form-check-input" />
                    Nữ
                  </label>
                </div>
              </div>

              {/* Smoking & CancerHistory */}
              <div className="col-md-6">
                <label htmlFor="smoking" className="form-label">Hút thuốc</label>
                <select id="smoking" name="Smoking" value={form.Smoking} onChange={handleChange}
                        className="form-select rounded-3">
                  <option value="0">Không</option>
                  <option value="1">Có</option>
                </select>
              </div>
              <div className="col-md-6">
                <label htmlFor="history" className="form-label">Tiền sử ung thư</label>
                <select id="history" name="CancerHistory" value={form.CancerHistory} onChange={handleChange}
                        className="form-select rounded-3">
                  <option value="0">Không</option>
                  <option value="1">Có</option>
                </select>
              </div>

              {/* Activity & Alcohol */}
              <div className="col-md-6">
                <label htmlFor="activity" className="form-label">Vận động (0–10)</label>
                <input id="activity" type="range" name="PhysicalActivity" min="0" max="10" step="0.5"
                       value={form.PhysicalActivity} onChange={handleChange} className="form-range" />
                <div className="text-muted small">{form.PhysicalActivity}/10</div>
              </div>
              <div className="col-md-6">
                <label htmlFor="alcohol" className="form-label">Rượu/Bia (0–5)</label>
                <input id="alcohol" type="range" name="AlcoholIntake" min="0" max="5" step="0.5"
                       value={form.AlcoholIntake} onChange={handleChange} className="form-range" />
                <div className="text-muted small">{form.AlcoholIntake}/5</div>
              </div>

              {/* GeneticRisk */}
              <div className="col-12">
                <label htmlFor="genRisk" className="form-label">Nguy cơ di truyền (0–2)</label>
                <select id="genRisk" name="GeneticRisk" value={form.GeneticRisk} onChange={handleChange}
                        className="form-select rounded-3">
                  <option value="0">Họ hàng không có tiền sử ung thư</option>
                  <option value="1">Họ hàng xa có tiền sử ung thư</option>
                  <option value="2">Họ hàng gần có tiền sử ung thư</option>
                </select>
              </div>

              {/* Submit */}
              <div className="col-12 d-flex gap-2">
                <button type="submit" disabled={loading}
                        className="btn btn-primary flex-grow-1 py-3 rounded-3 fw-semibold">
                  {loading ? "Đang phân tích..." : "🔍 Đánh giá nguy cơ"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setResult(null)}>
                  Reset kết quả
                </button>
              </div>
            </form>

            {/* Loading skeleton nhỏ */}
            {loading && (
              <div className="mt-4">
                <div className="placeholder-glow">
                  <span className="placeholder col-7"></span>
                  <span className="placeholder col-4"></span>
                  <span className="placeholder col-4"></span>
                  <span className="placeholder col-6"></span>
                  <span className="placeholder col-8"></span>
                </div>
              </div>
            )}

            {/* Result */}
            {result && !result.error && (() => {
              const prob = Number(result.probability_cancer ?? 0);
              const tier = getRiskTier(prob);
              const predictedRisk = result.prediction ? "⚠️ Có nguy cơ" : "✅ An toàn";

              return (
                <div className="mt-5">
                  <div className="p-4 bg-white border-start border-4 border-primary rounded-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-start">
                      <h5 className="fw-bold mb-3">📊 Kết quả DSS</h5>
                      <span className={`badge text-bg-${tier.badge}`}>{tier.label}</span>
                    </div>

                    <p className="mb-1">
                      Dự đoán:{" "}
                      <span className={result.prediction ? "text-danger fw-bold" : "text-success fw-bold"}>
                        {predictedRisk}
                      </span>
                    </p>

                    <p className="mb-2">
                      Xác suất: <strong>{fmtPct(prob)}</strong>
                    </p>

                    <div className="progress" style={{ height: 6 }}>
                      <div className={`progress-bar ${tier.bar}`} style={{ width: fmtPct(prob) }} />
                    </div>

                    <div className={`alert alert-${tier.badge} mt-3 mb-0`}>
                      {tier.cta}
                    </div>
                  </div>

                  {/* DSS Advice */}
                  <div className="p-4 bg-white rounded-3 shadow-sm mt-4">
                    <h6 className="fw-bold mb-3">📋 DSS – Khuyến nghị chi tiết</h6>
                    <ul className="mb-0">
                      {getDetailedAdvice(lastPayload, tier.key).map((advice, i) => (
                        <li key={i} className="mb-1">{advice}</li>
                      ))}
                    </ul>
                  </div>

                  {/* ⚖️ So sánh BMI */}
                  <div className="p-4 bg-white rounded-3 shadow-sm mt-4">
                    <h6 className="fw-bold mb-3">⚖️ So sánh chỉ số BMI</h6>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="fw-semibold">Theo giới tính</div>
                        <div className={`fw-bold ${bmiGenderInfo.color}`}>
                          {form.BMI || "--"} → {bmiGenderInfo.category || "—"}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="fw-semibold">Theo chuẩn WHO</div>
                        <div className={`fw-bold ${bmiWHOInfo.color}`}>
                          {form.BMI || "--"} → {bmiWHOInfo.category || "—"}
                        </div>
                      </div>
                    </div>
                    <small className="text-muted d-block mt-2">
                      * Chỉ báo tham khảo, không thay thế tư vấn y khoa.
                    </small>
                  </div>

                  {/* WHAT-IF: Scenario Explorer (model-backed + fallback) */}
                  {scenario && baseProb != null && (
                    <div className="p-4 bg-white rounded-3 shadow-sm mt-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold mb-0">🧪 Scenario Explorer</h6>
                        {/* Badge trạng thái */}
                        {scenLoading ? (
                          <span className="badge text-bg-secondary">Đang tính bằng mô hình…</span>
                        ) : scenarioResult ? (
                          (() => {
                            const sp = Number(scenarioResult.probability_cancer ?? 0);
                            const st = getRiskTier(sp);
                            return <span className={`badge text-bg-${st.badge}`}>Mô hình: {fmtPct(sp)} • {st.label}</span>;
                          })()
                        ) : (simProb != null ? (
                          <span className={`badge text-bg-${simTier.badge}`}>Heuristic: {fmtPct(simProb)} • {simTier.label}</span>
                        ) : (
                          <span className="badge text-bg-secondary">—</span>
                        ))}
                      </div>

                      <small className="text-muted d-block mb-3">
                        * What-if gọi trực tiếp mô hình qua <code>/predict</code> (debounce + cache). Nếu offline/lỗi, hệ thống tạm dùng ước tính heuristic phía client.
                      </small>
                      {scenError && <div className="alert alert-warning py-2">{scenError}</div>}

                      <div className="row g-3">
                        <div className="col-md-4">
                          <label className="form-label">Hút thuốc</label>
                          <select
                            className="form-select"
                            value={scenario.Smoking}
                            onChange={(e) => setScenario({ ...scenario, Smoking: parseInt(e.target.value, 10) })}
                          >
                            <option value={0}>Không</option>
                            <option value={1}>Có</option>
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Nguy cơ di truyền</label>
                          <select
                            className="form-select"
                            value={scenario.GeneticRisk}
                            onChange={(e) => setScenario({ ...scenario, GeneticRisk: parseInt(e.target.value, 10) })}
                          >
                            <option value={0}>0</option>
                            <option value={1}>1</option>
                            <option value={2}>2</option>
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Tiền sử ung thư</label>
                          <select
                            className="form-select"
                            value={scenario.CancerHistory}
                            onChange={(e) => setScenario({ ...scenario, CancerHistory: parseInt(e.target.value, 10) })}
                          >
                            <option value={0}>Không</option>
                            <option value={1}>Có</option>
                          </select>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">BMI</label>
                          <input
                            type="number"
                            className="form-control"
                            step="0.1"
                            min="12"
                            max="55"
                            value={scenario.BMI}
                            onChange={(e) => setScenario({ ...scenario, BMI: parseFloat(e.target.value) || 0 })}
                          />
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Vận động (0–10)</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="10"
                            step="0.5"
                            value={scenario.PhysicalActivity}
                            onChange={(e) =>
                              setScenario({ ...scenario, PhysicalActivity: parseFloat(e.target.value) || 0 })
                            }
                          />
                          <div className="text-muted small">{scenario.PhysicalActivity}/10</div>
                        </div>

                        <div className="col-md-4">
                          <label className="form-label">Rượu/Bia (0–5)</label>
                          <input
                            type="range"
                            className="form-range"
                            min="0"
                            max="5"
                            step="0.5"
                            value={scenario.AlcoholIntake}
                            onChange={(e) =>
                              setScenario({ ...scenario, AlcoholIntake: parseFloat(e.target.value) || 0 })
                            }
                          />
                          <div className="text-muted small">{scenario.AlcoholIntake}/5</div>
                        </div>
                      </div>

                      {/* So sánh xác suất */}
                      <div className="mt-3">
                        <div className="d-flex align-items-center gap-3">
                          <div>
                            <div className="small text-muted">Xác suất gốc</div>
                            <div className="fw-bold">{fmtPct(baseProb ?? 0)}</div>
                          </div>
                          <div className="small text-muted">→</div>
                          <div>
                            <div className="small text-muted">Kết quả What-if</div>
                            <div className="fw-bold">
                              {scenarioResult
                                ? fmtPct(Number(scenarioResult.probability_cancer ?? 0))
                                : (simProb != null ? fmtPct(simProb) : "—")}
                            </div>
                          </div>
                        </div>

                        <div className="progress mt-2" style={{ height: 6 }}>
                          {/* Base */}
                          <div className="progress-bar bg-secondary" style={{ width: fmtPct(baseProb ?? 0) }} />
                          {/* Scenario by model */}
                          {scenarioResult ? (
                            (() => {
                              const sp = Number(scenarioResult.probability_cancer ?? 0);
                              const st = getRiskTier(sp);
                              return <div className={`progress-bar ${st.bar}`} style={{ width: fmtPct(sp) }} />;
                            })()
                          ) : (simProb != null && (
                            <div className={`progress-bar ${simTier.bar}`} style={{ width: fmtPct(simProb) }} />
                          ))}
                        </div>
                      </div>

                      <div className="mt-3 d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => {
                            // áp dụng scenario vào form (giữ Height/Weight cũ)
                            setForm((prev) => ({
                              ...prev,
                              Smoking: String(scenario.Smoking),
                              GeneticRisk: String(scenario.GeneticRisk),
                              CancerHistory: String(scenario.CancerHistory),
                              PhysicalActivity: String(scenario.PhysicalActivity),
                              AlcoholIntake: String(scenario.AlcoholIntake),
                              BMI: String(scenario.BMI),
                            }));
                          }}
                        >
                          Áp dụng vào form
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => setScenario(lastPayload ? { ...lastPayload } : scenario)}
                        >
                          Reset scenario
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lưu ý pháp lý */}
                  <div className="alert alert-secondary mt-4 mb-0">
                    <strong>Lưu ý:</strong> Hệ thống DSS chỉ mang tính hỗ trợ, không thay thế chẩn đoán hay chỉ định
                    của bác sĩ. Nếu kết quả thuộc nhóm <em>Báo động</em> hoặc <em>Nguy hiểm</em>, hãy chủ động liên hệ
                    cơ sở y tế gần nhất để được tư vấn.
                  </div>
                </div>
              );
            })()}

            {result && result.error && (
              <div className="mt-5 p-4 bg-danger text-white rounded-3 shadow-sm">
                <h5 className="fw-bold mb-2">❌ Lỗi</h5>
                <p className="mb-0">{result.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* HISTORY */}
        <div className="card shadow-sm border-0 rounded-4 mt-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold">🗂️ Lịch sử đánh giá</h5>
              <span className="text-muted small">{history.length} bản ghi</span>
            </div>
            {history.length === 0 ? (
              <div className="text-muted">Chưa có bản ghi nào. Hãy chạy dự đoán để lưu lịch sử.</div>
            ) : (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Age</th>
                      <th>BMI</th>
                      <th>Smoke</th>
                      <th>Gen</th>
                      <th>Act</th>
                      <th>Alc</th>
                      <th>Hist</th>
                      <th>Prob</th>
                      <th>Pred</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice(0, 20).map((h) => {
                      const p = Number(h.response?.probability_cancer ?? 0);
                      const tier = getRiskTier(p);
                      return (
                        <tr key={h.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{new Date(h.ts).toLocaleString()}</td>
                          <td>{h.payload.Age}</td>
                          <td>{h.payload.BMI}</td>
                          <td>{h.payload.Smoking}</td>
                          <td>{h.payload.GeneticRisk}</td>
                          <td>{h.payload.PhysicalActivity}</td>
                          <td>{h.payload.AlcoholIntake}</td>
                          <td>{h.payload.CancerHistory}</td>
                          <td>
                            <span className={`badge text-bg-${tier.badge}`}>{fmtPct(p)}</span>
                          </td>
                          <td>{h.response?.prediction ? "1" : "0"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <small className="text-muted">
                  * Hiển thị 20 bản ghi gần nhất (tối đa lưu 200). Bạn có thể Export CSV để xem đầy đủ.
                </small>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
