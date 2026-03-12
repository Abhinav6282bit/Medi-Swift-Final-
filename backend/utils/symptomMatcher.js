/**
 * AI Symptom-to-Specialization Matcher
 * Maps patient symptoms/reasons to the most relevant medical specialization.
 * Uses keyword-based NLP matching with confidence scoring.
 */

const specializations = {
    'Cardiology': {
        keywords: ['heart', 'chest pain', 'chest', 'palpitations', 'blood pressure', 'bp', 'hypertension', 'cardiac', 'heartbeat', 'arrhythmia', 'cholesterol', 'angina', 'heart attack', 'stroke risk', 'breathless', 'shortness of breath'],
        description: 'Heart & Cardiovascular System'
    },
    'Neurology': {
        keywords: ['headache', 'migraine', 'brain', 'nerve', 'seizure', 'epilepsy', 'dizziness', 'vertigo', 'numbness', 'tingling', 'memory loss', 'paralysis', 'stroke', 'tremor', 'fainting', 'confusion', 'neuropathy'],
        description: 'Brain & Nervous System'
    },
    'Orthopedics': {
        keywords: ['bone', 'fracture', 'joint', 'knee', 'back pain', 'spine', 'shoulder', 'hip', 'arthritis', 'sprain', 'muscle pain', 'leg pain', 'hand pain', 'wrist', 'ankle', 'posture', 'disc', 'slip disc', 'scoliosis', 'sports injury'],
        description: 'Bones, Joints & Muscles'
    },
    'Pediatrics': {
        keywords: ['child', 'baby', 'infant', 'kid', 'toddler', 'vaccination', 'growth', 'fever child', 'child cough', 'newborn', 'pediatric', 'childhood', 'developmental'],
        description: 'Child Healthcare'
    },
    'General Medicine': {
        keywords: ['fever', 'cold', 'cough', 'flu', 'weakness', 'fatigue', 'body pain', 'vomiting', 'nausea', 'diarrhea', 'weight loss', 'diabetes', 'thyroid', 'general checkup', 'check up', 'routine', 'viral', 'infection', 'malaria', 'dengue', 'covid', 'sore throat'],
        description: 'General Health & Internal Medicine'
    },
    'Dermatology': {
        keywords: ['skin', 'rash', 'acne', 'pimple', 'eczema', 'itching', 'allergy', 'hair loss', 'fungal', 'psoriasis', 'pigmentation', 'wart', 'mole', 'dandruff', 'skin infection', 'burn', 'cosmetic'],
        description: 'Skin, Hair & Cosmetic'
    },
    'ENT': {
        keywords: ['ear', 'nose', 'throat', 'hearing', 'tonsil', 'sinus', 'sinusitis', 'nose block', 'ear pain', 'snoring', 'voice', 'adenoid', 'nasal', 'ear infection', 'hearing loss', 'tinnitus', 'swallowing'],
        description: 'Ear, Nose & Throat'
    },
    'Gynecology': {
        keywords: ['pregnancy', 'period', 'menstrual', 'uterus', 'ovary', 'pcos', 'pcod', 'fertility', 'contraception', 'breast', 'vaginal', 'prenatal', 'postnatal', 'menopause', 'cramps', 'irregular periods', 'women health'],
        description: 'Women\'s Health & Obstetrics'
    },
    'Ophthalmology': {
        keywords: ['eye', 'vision', 'glasses', 'blur', 'cataract', 'glaucoma', 'eye pain', 'redness eye', 'dry eyes', 'watery eyes', 'spectacles', 'lens', 'retina', 'squint', 'night blindness', 'color blind'],
        description: 'Eye & Vision Care'
    },
    'Psychiatry': {
        keywords: ['anxiety', 'depression', 'stress', 'sleep', 'insomnia', 'panic', 'mental', 'mood', 'bipolar', 'ocd', 'trauma', 'ptsd', 'suicidal', 'addiction', 'counseling', 'therapy', 'anger', 'fear', 'phobia', 'hallucination'],
        description: 'Mental Health & Counseling'
    }
};

/**
 * Match patient symptoms to the best specialization
 * @param {string} symptomText - The patient's described symptoms
 * @returns {Object} - Matched specialization with confidence and reasoning
 */
function matchSymptoms(symptomText) {
    if (!symptomText || typeof symptomText !== 'string') {
        return {
            success: true, // Fail gracefully to general medicine
            matched: {
                specialization: 'General Medicine',
                description: 'General Health & Internal Medicine',
                confidence: 0,
                matchedKeywords: [],
                reasoning: "No symptoms provided. Prompting general checkup."
            },
            alternatives: []
        };
    }
    const input = symptomText.toLowerCase().trim();
    const results = [];

    for (const [specialization, data] of Object.entries(specializations)) {
        let matchCount = 0;
        const matchedKeywords = [];

        for (const keyword of data.keywords) {
            if (input.includes(keyword.toLowerCase())) {
                matchCount++;
                matchedKeywords.push(keyword);
            }
        }

        if (matchCount > 0) {
            const confidence = Math.min(Math.round((matchCount / 3) * 100), 98);
            results.push({
                specialization,
                description: data.description,
                confidence,
                matchedKeywords,
                matchCount
            });
        }
    }

    // Sort by match count (more keyword matches = better fit)
    results.sort((a, b) => b.matchCount - a.matchCount);

    if (results.length === 0) {
        return {
            success: true,
            matched: {
                specialization: 'General Medicine',
                description: 'General Health & Internal Medicine',
                confidence: 60,
                matchedKeywords: ['general assessment'],
                reasoning: `Your symptoms didn't match a specific specialization. We recommend starting with General Medicine for a comprehensive evaluation.`
            },
            alternatives: []
        };
    }

    const best = results[0];
    return {
        success: true,
        matched: {
            ...best,
            reasoning: `Based on your symptoms mentioning "${best.matchedKeywords.join(', ')}", we recommend ${best.specialization} (${best.description}).`
        },
        alternatives: results.slice(1, 3) // Top 2 alternatives
    };
}

module.exports = { matchSymptoms, specializations };
