import {useState} from "react";
import axios from "axios";

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
        AlcoholIntake: "0", // 0..5
        CancerHistory: "0", // 0 = No, 1 = Yes
    });

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [lastPayload, setLastPayload] = useState(null);

    // BMI theo giới
    const getBMICategoryByGender = (bmi, gender) => {
        const x = parseFloat(bmi);
        if (isNaN(x)) return {category: "", color: ""};
        if (gender === "0") {
            if (x < 18.5) return {category: "Thiếu cân", color: "text-info"};
            if (x < 24.9) return {category: "Bình thường", color: "text-success"};
            if (x < 29.9) return {category: "Thừa cân", color: "text-warning"};
            return {category: "Béo phì", color: "text-danger"};
        } else {
            if (x < 18.5) return {category: "Thiếu cân", color: "text-info"};
            if (x < 23.9) return {category: "Bình thường", color: "text-success"};
            if (x < 28.9) return {category: "Thừa cân", color: "text-warning"};
            return {category: "Béo phì", color: "text-danger"};
        }
    };

    // BMI WHO
    const getWHOCategory = (bmi) => {
        const x = parseFloat(bmi);
        if (isNaN(x)) return {category: "", color: ""};
        if (x < 18.5) return {category: "Underweight (WHO)", color: "text-info"};
        if (x < 25) return {category: "Normal (WHO)", color: "text-success"};
        if (x < 30) return {category: "Overweight (WHO)", color: "text-warning"};
        return {category: "Obesity (WHO)", color: "text-danger"};
    };

    const handleChange = (e) => {
        const {name, value} = e.target;
        setForm((prev) => {
            const updated = {...prev, [name]: value};
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
        setLoading(true);
        setResult(null);

        const payload = {
            Age: parseInt(form.Age, 10),
            Gender: parseInt(form.Gender, 10), // 0 = Male, 1 = Female
            BMI: parseFloat(form.BMI) || 0,
            Smoking: parseInt(form.Smoking, 10), // 0 = No, 1 = Yes
            GeneticRisk: parseInt(form.GeneticRisk, 10), // 0..2
            PhysicalActivity: parseFloat(form.PhysicalActivity) || 0,
            AlcoholIntake: parseInt(form.AlcoholIntake, 10),
            CancerHistory: parseInt(form.CancerHistory, 10), // 0 = No, 1 = Yes
        };

        console.log("📤 Request gửi backend:", payload);
        setLastPayload(payload);

        try {
            const res = await axios.post("http://127.0.0.1:8010/predict", payload, {
                headers: {"Content-Type": "application/json"},
            });

            console.log("📥 Response backend:", res.data);
            setResult(res.data);
        } catch (err) {
            console.error("❌ Lỗi khi gọi API:", err);
            setResult({error: true, message: "Không thể kết nối backend."});
        } finally {
            setLoading(false);
        }
    };

    // Recommendation chung
    const getRecommendation = (p) => {
        if (p < 0.1)
            return {text: "Nguy cơ thấp. Gần như an toàn.", color: "success"};
        if (p < 0.2)
            return {text: "Nguy cơ trung bình. Duy trì lối sống lành mạnh.", color: "info"};
        if (p < 0.35)
            return {text: "Nguy cơ cao. Cần chú ý chế độ sinh hoạt và nên đi khám thường xuyên.", color: "warning"};
        if (p < 0.5)
            return {
                text: "Nguy cơ trung bình. DSS khuyên bạn thay đổi lối sống và nên đi khám sớm nhất có thể.",
                color: "warning"
            };
        if (p < 0.7)
            return {text: "Nguy hiểm ⚠️. DSS khuyên nên đi khám và tầm soát ngay lập tức.", color: "danger"};
        return {text: "Nguy hiểm 🚨. Cần đi khám và tầm soát ngay lập tức.", color: "danger"};
    };


    // DSS chi tiết
    const getDetailedAdvice = (payload) => {
        const advices = [];
        if (!payload) return advices;

        if (payload.Smoking === 1) advices.push("🚬 Bạn đang hút thuốc, DSS khuyên nên bỏ thuốc lá.");
        if (payload.BMI >= 25) advices.push("⚖️ BMI cao, DSS khuyên bạn giảm cân và điều chỉnh chế độ ăn.");
        if (payload.BMI > 0 && payload.BMI < 18.5) advices.push("⚖️ BMI thấp, DSS khuyên bạn nên tăng cân hợp lý.");
        if (payload.AlcoholIntake > 2) advices.push("🍺 Bạn uống rượu/bia nhiều, DSS khuyên nên hạn chế.");
        if (payload.PhysicalActivity < 3) advices.push("🏃 Bạn ít vận động, DSS khuyên nên tập thể dục thường xuyên.");
        if (payload.GeneticRisk === 2) advices.push("🧬 Nguy cơ di truyền cao, DSS khuyên nên tầm soát định kỳ.");
        if (payload.CancerHistory === 1) advices.push("🏥 Có tiền sử ung thư, DSS khuyên tham khảo bác sĩ chuyên khoa.");

        if (advices.length === 0) advices.push("✅ Lối sống hiện tại khá tốt, DSS khuyên bạn duy trì.");
        return advices;
    };

    const bmiGenderInfo = getBMICategoryByGender(form.BMI, form.Gender);
    const bmiWHOInfo = getWHOCategory(form.BMI);

    return (
        <div className="min-vh-100 d-flex align-items-center bg-light py-5">
            <div className="container" style={{maxWidth: "800px"}}>
                <div className="card shadow-sm border-0 rounded-4">
                    <div className="card-body p-4 p-md-5">
                        <h3 className="text-center fw-bold mb-4">🧬 DSS dự đoán nguy cơ ung thư </h3>

                        {/* FORM */}
                        <form onSubmit={handleSubmit} className="row g-4">
                            {/* Age - Height - Weight - BMI */}
                            <div className="col-md-3">
                                <label className="form-label">Tuổi</label>
                                <input type="number" name="Age" value={form.Age} onChange={handleChange}
                                       className="form-control rounded-3" required/>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Chiều cao (cm)</label>
                                <input type="number" name="Height" value={form.Height} onChange={handleChange}
                                       className="form-control rounded-3" required/>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">Cân nặng (kg)</label>
                                <input type="number" name="Weight" value={form.Weight} onChange={handleChange}
                                       className="form-control rounded-3" required/>
                            </div>
                            <div className="col-md-3">
                                <label className="form-label">BMI</label>
                                <input type="text" className={`form-control rounded-3 fw-bold ${bmiGenderInfo.color}`}
                                       value={form.BMI} readOnly/>
                                <small className={`${bmiWHOInfo.color}`}>{bmiWHOInfo.category}</small>
                            </div>

                            {/* Gender */}
                            <div className="col-12">
                                <label className="form-label d-block">Giới tính</label>
                                <div className="d-flex gap-3">
                                    <label className="form-check">
                                        <input type="radio" name="Gender" value="0" checked={form.Gender === "0"}
                                               onChange={handleChange} className="form-check-input"/>
                                        Nam
                                    </label>
                                    <label className="form-check">
                                        <input type="radio" name="Gender" value="1" checked={form.Gender === "1"}
                                               onChange={handleChange} className="form-check-input"/>
                                        Nữ
                                    </label>
                                </div>
                            </div>

                            {/* Smoking & CancerHistory */}
                            <div className="col-md-6">
                                <label className="form-label">Hút thuốc</label>
                                <select name="Smoking" value={form.Smoking} onChange={handleChange}
                                        className="form-select rounded-3">
                                    <option value="0">Không</option>
                                    <option value="1">Có</option>
                                </select>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Tiền sử ung thư</label>
                                <select name="CancerHistory" value={form.CancerHistory} onChange={handleChange}
                                        className="form-select rounded-3">
                                    <option value="0">Không</option>
                                    <option value="1">Có</option>
                                </select>
                            </div>

                            {/* Activity & Alcohol */}
                            <div className="col-md-6">
                                <label className="form-label">Vận động (0–10)</label>
                                <input type="range" name="PhysicalActivity" min="0" max="10"
                                       value={form.PhysicalActivity} onChange={handleChange} className="form-range"/>
                                <div className="text-muted small">{form.PhysicalActivity}/10</div>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label">Rượu/Bia (0–5)</label>
                                <input type="range" name="AlcoholIntake" min="0" max="5" value={form.AlcoholIntake}
                                       onChange={handleChange} className="form-range"/>
                                <div className="text-muted small">{form.AlcoholIntake}/5</div>
                            </div>

                            {/* GeneticRisk */}
                            <div className="col-12">
                                <label className="form-label">Nguy cơ di truyền (0–2)</label>
                                <select name="GeneticRisk" value={form.GeneticRisk} onChange={handleChange}
                                        className="form-select rounded-3">
                                    <option value="0">Thấp</option>
                                    <option value="1">Trung bình</option>
                                    <option value="2">Cao</option>
                                </select>
                            </div>

                            {/* Submit */}
                            <div className="col-12">
                                <button type="submit" disabled={loading}
                                        className="btn btn-primary w-100 py-3 rounded-3 fw-semibold">
                                    {loading ? "Đang phân tích..." : "🔍 Đánh giá nguy cơ"}
                                </button>
                            </div>
                        </form>

                        {/* Result */}
                        {result && !result.error && (
                            <div className="mt-5">
                                <div className="p-4 bg-white border-start border-4 border-primary rounded-3 shadow-sm">
                                    <h5 className="fw-bold mb-3">📊 Kết quả DSS</h5>
                                    <p>
                                        Dự đoán:{" "}
                                        <span
                                            className={result.prediction ? "text-danger fw-bold" : "text-success fw-bold"}>
                      {result.prediction ? "⚠️ Có nguy cơ" : "✅ An toàn"}
                    </span>
                                    </p>
                                    <p>
                                        Xác suất: <strong>{(result.probability_cancer * 100).toFixed(1)}%</strong>
                                    </p>
                                    <div className="progress" style={{height: "6px"}}>
                                        <div
                                            className={`progress-bar ${
                                                result.probability_cancer >= 0.6 ? "bg-danger" : result.probability_cancer >= 0.3 ? "bg-warning" : "bg-success"
                                            }`}
                                            style={{width: `${(result.probability_cancer * 100).toFixed(1)}%`}}
                                        />
                                    </div>
                                    <div
                                        className={`alert alert-${getRecommendation(result.probability_cancer).color} mt-3`}>
                                        {getRecommendation(result.probability_cancer).text}
                                    </div>
                                </div>

                                {/* DSS Advice */}
                                <div className="p-4 bg-white rounded-3 shadow-sm mt-4">
                                    <h6 className="fw-bold mb-3">📋 DSS – Khuyến nghị chi tiết</h6>
                                    <ul className="mb-0">
                                        {getDetailedAdvice(lastPayload).map((advice, i) => (
                                            <li key={i} className="mb-1">{advice}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* BMI Compare */}
                                {/* So sánh BMI */}
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
                                        * So sánh chỉ số BMI của bạn theo chuẩn giới tính và chuẩn WHO.
                                    </small>
                                </div>
                            </div>
                        )}

                        {result && result.error && (
                            <div className="mt-5 p-4 bg-danger text-white rounded-3 shadow-sm">
                                <h5 className="fw-bold mb-2">❌ Lỗi</h5>
                                <p>{result.message}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
