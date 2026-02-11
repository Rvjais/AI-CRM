import React, { useState, useEffect } from 'react';
import {
    Plus, Trash2, Code, Layout, Save, ArrowLeft,
    Settings, Type, CheckSquare, ChevronDown,
    Copy, ExternalLink, MoveUp, MoveDown, Eye,
    Terminal, Mail, Hash, AlignLeft, AlignCenter, AlignRight, Palette,
    BarChart2, Loader
} from 'lucide-react';
import api from '../utils/apiClient';
import './FormBuilder.css';

// --- Theme Configurations ---
const THEMES = {
    blue: {
        name: 'Classic Blue',
        primary: '#4f46e5', // indigo-600
        bg: '#eff6ff', // blue-50
        border: '#e0e7ff', // blue-100
        text: '#1e1b4b' // indigo-950
    },
    green: {
        name: 'Nature Green',
        primary: '#059669', // emerald-600
        bg: '#ecfdf5', // emerald-50
        border: '#d1fae5', // emerald-100
        text: '#064e3b' // emerald-950
    },
    purple: {
        name: 'Royal Purple',
        primary: '#7c3aed', // violet-600
        bg: '#f5f3ff', // violet-50
        border: '#ede9fe', // violet-100
        text: '#4c1d95' // violet-950
    },
    dark: {
        name: 'Modern Dark',
        primary: '#2563eb', // blue-600
        bg: '#1f2937', // gray-800
        border: '#374151', // gray-700
        text: '#f3f4f6' // gray-100
    },
    orange: {
        name: 'Warm Orange',
        primary: '#ea580c', // orange-600
        bg: '#fff7ed', // orange-50
        border: '#fed7aa', // orange-200
        text: '#7c2d12' // orange-900
    },
    teal: {
        name: 'Deep Teal',
        primary: '#0d9488', // teal-600
        bg: '#f0fdfa', // teal-50
        border: '#ccfbf1', // teal-100
        text: '#134e4a' // teal-900
    },
    rose: {
        name: 'Soft Rose',
        primary: '#e11d48', // rose-600
        bg: '#fff1f2', // rose-50
        border: '#fecdd3', // rose-200
        text: '#881337' // rose-900
    }
};

const DEFAULT_DESIGN_CONFIG = {
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    buttonColor: '#4f46e5',
    borderRadius: '0.75rem',
    maxWidth: '42rem', // max-w-2xl
    textAlign: 'left',
    fontSize: '1rem',
    titleColor: '#111827',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '2rem',
    minHeight: 'auto'
};

export default function FormBuilder() {
    const [view, setView] = useState('dashboard'); // dashboard, editor, preview, submissions
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentForm, setCurrentForm] = useState(null);
    const [selectedField, setSelectedField] = useState(null);
    const [showEmbedModal, setShowEmbedModal] = useState(false);
    const [submissions, setSubmissions] = useState([]);
    const [activeTab, setActiveTab] = useState('editor'); // editor, design, settings

    // Load forms on mount
    useEffect(() => {
        fetchForms();
    }, []);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/forms');
            if (response.success) {
                setForms(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch forms', error);
            // alert('Failed to load forms');
        } finally {
            setLoading(false);
        }
    };

    const createNewForm = async () => {
        const newFormPayload = {
            title: 'Untitled Form',
            description: 'Please fill out the form below.',
            fields: [],
            theme: 'blue',
            designConfig: DEFAULT_DESIGN_CONFIG
        };

        try {
            const response = await api.post('/api/forms', newFormPayload);
            if (response.success) {
                setForms([response.data, ...forms]);
                setCurrentForm(response.data);
                setSelectedField(null);
                setView('editor');
                setActiveTab('editor');
            }
        } catch (error) {
            console.error('Failed to create form', error);
            alert('Failed to create new form');
        }
    };

    const editForm = async (formId) => {
        setLoading(true);
        try {
            const response = await api.get(`/api/forms/${formId}`);
            if (response.success) {
                // Ensure designConfig exists and has defaults
                const form = response.data;
                form.designConfig = { ...DEFAULT_DESIGN_CONFIG, ...form.designConfig };
                setCurrentForm(form);
                setSelectedField(null);
                setView('editor');
                setActiveTab('editor');
            }
        } catch (error) {
            console.error('Failed to fetch form details', error);
            alert('Failed to load form details');
        } finally {
            setLoading(false);
        }
    };

    const deleteForm = async (e, formId) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this form? All submissions will also be deleted.')) {
            try {
                await api.delete(`/api/forms/${formId}`);
                setForms(forms.filter(f => f._id !== formId));
            } catch (error) {
                console.error('Failed to delete form', error);
                alert('Failed to delete form');
            }
        }
    };

    const saveCurrentForm = async (silent = false) => {
        if (!currentForm) return;

        try {
            const response = await api.put(`/api/forms/${currentForm._id}`, currentForm);
            if (response.success) {
                setForms(prev => prev.map(f => f._id === currentForm._id ? response.data : f));
                if (!silent) alert('Form saved successfully!');
            }
        } catch (error) {
            console.error('Failed to save form', error);
            if (!silent) alert('Failed to save form');
        }
    };

    const fetchSubmissions = async (formId) => {
        setLoading(true);
        try {
            const response = await api.get(`/api/forms/${formId}/submissions`);
            if (response.success) {
                setSubmissions(response.data);
                setView('submissions');
                // Need to load form details too if not loaded, to get field labels
                if (!currentForm || currentForm._id !== formId) {
                    const formRes = await api.get(`/api/forms/${formId}`);
                    if (formRes.success) setCurrentForm(formRes.data);
                }
            }
        } catch (error) {
            console.error('Failed to fetch submissions', error);
            alert('Failed to load submissions');
        } finally {
            setLoading(false);
        }
    };

    const addField = (type) => {
        const newField = {
            id: `field_${Date.now()}`,
            type,
            label: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
            placeholder: '',
            required: false,
            width: 'full', // Default width
            options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : []
        };

        setCurrentForm(prev => ({
            ...prev,
            fields: [...prev.fields, newField]
        }));
        setSelectedField(newField);
    };

    const updateField = (id, updates) => {
        setCurrentForm(prev => ({
            ...prev,
            fields: prev.fields.map(f => f.id === id ? { ...f, ...updates } : f)
        }));
        setSelectedField(prev => ({ ...prev, ...updates }));
    };

    const removeField = (e, id) => {
        e.stopPropagation();
        setCurrentForm(prev => ({
            ...prev,
            fields: prev.fields.filter(f => f.id !== id)
        }));
        if (selectedField?.id === id) setSelectedField(null);
    };

    const moveField = (index, direction) => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === currentForm.fields.length - 1) return;

        const newFields = [...currentForm.fields];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];

        setCurrentForm(prev => ({ ...prev, fields: newFields }));
    };

    const updateDesignConfig = (key, value) => {
        setCurrentForm(prev => ({
            ...prev,
            designConfig: {
                ...prev.designConfig,
                [key]: value
            }
        }));
    };

    const generateEmbedCode = (format) => {
        if (!currentForm) return '';
        // Use backend API URL instead of frontend origin
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://rain-crm-backend.onrender.com';
        const apiUrl = `${apiBaseUrl}/api/forms/${currentForm._id}/submit`;
        const config = currentForm.designConfig || DEFAULT_DESIGN_CONFIG;

        const formHtml = currentForm.fields.map(field => {
            let inputHtml = '';
            const req = field.required ? ' required' : '';
            // Width: full = 100%, half = approx 48% (with gap)
            // We will use flexbox with wrap in the form container
            const widthStyle = field.width === 'half' ? 'width: 48%;' : 'width: 100%;';

            const label = `<label style="display:block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; color: ${config.textColor}; text-align: left;">${field.label}${field.required ? '<span style="color:red">*</span>' : ''}</label>`;
            const inputStyle = `width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #d1d5db; border-radius: 0.375rem; font-size: ${config.fontSize}; font-family: inherit; margin-bottom: 0; box-sizing: border-box; background-color: #ffffff; color: #1f2937;`;

            switch (field.type) {
                case 'textarea':
                    inputHtml = `<textarea name="${field.label}" placeholder="${field.placeholder}" style="${inputStyle} min-height: 100px; font-family: inherit;"${req}></textarea>`;
                    break;
                case 'select':
                    inputHtml = `<select name="${field.label}" style="${inputStyle}"${req}>\n${field.options.map(o => `            <option value="${o}">${o}</option>`).join('\n')}\n          </select>`;
                    break;
                case 'checkbox':
                    // For checkbox, we want it to be flex
                    return `<div style="${widthStyle} display: flex; align-items: center; margin-bottom: 1rem;">
          <input type="checkbox" id="${field.id}" name="${field.label}" style="height: 1rem; width: 1rem; margin-right: 0.5rem;"${req}>
          <label for="${field.id}" style="font-size: ${config.fontSize}; color: ${config.textColor};">${field.label}${field.required ? '*' : ''}</label>
        </div>`;
                default:
                    inputHtml = `<input type="${field.type}" name="${field.label}" placeholder="${field.placeholder}" style="${inputStyle}"${req}>`;
            }
            return `        <div style="text-align: left; margin-bottom: 1rem; ${widthStyle}">\n          ${field.type !== 'checkbox' ? label : ''}\n          ${inputHtml}\n        </div>`;
        }).join('\n');

        if (format === 'html') {
            return `<!-- Embeddable Form: ${currentForm.title} -->
<div id="rain-crm-form-${currentForm._id}" style="font-family: ${config.fontFamily}; max-width: ${config.maxWidth}; min-height: ${config.minHeight}; margin: 0 auto; padding: ${config.padding}; background-color: ${config.backgroundColor}; border-radius: ${config.borderRadius}; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;">
  <h2 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem 0; color: ${config.titleColor}; text-align: ${config.textAlign};">${currentForm.title}</h2>
  <p style="color: ${config.textColor}; opacity: 0.8; margin: 0 0 1.5rem 0; text-align: ${config.textAlign}; font-size: ${config.fontSize};">${currentForm.description}</p>
  
  <form id="form-${currentForm._id}" onsubmit="submitRainForm(event, '${currentForm._id}')">
    <div style="display: flex; flex-wrap: wrap; justify-content: space-between;">
${formHtml}
    </div>
    <div style="text-align: ${config.textAlign}; margin-top: 1rem;">
      <button type="submit" style="width: 100%; background-color: ${config.buttonColor}; color: white; font-weight: 600; padding: 0.75rem; border-radius: 0.375rem; border: none; cursor: pointer; font-size: ${config.fontSize}; font-family: inherit;">Submit</button>
    </div>
  </form>
  <div id="form-message-${currentForm._id}" style="margin-top: 1rem; display: none; padding: 1rem; border-radius: 0.375rem; text-align: center;"></div>
</div>

<script>
  async function submitRainForm(e, formId) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const msgDiv = document.getElementById('form-message-' + formId);
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    btn.disabled = true;
    btn.innerText = 'Submitting...';
    
    try {
      const response = await fetch('${apiUrl}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      
      if (result.success) {
        msgDiv.style.display = 'block';
        msgDiv.style.backgroundColor = '#ecfdf5';
        msgDiv.style.color = '#065f46';
        msgDiv.innerText = 'Thank you! Your submission has been received.';
        form.reset();
      } else {
        throw new Error(result.message || 'Submission failed');
      }
    } catch (error) {
       msgDiv.style.display = 'block';
       msgDiv.style.backgroundColor = '#fef2f2';
       msgDiv.style.color = '#991b1b';
       msgDiv.innerText = 'Error: ' + error.message;
    } finally {
      btn.disabled = false;
      btn.innerText = 'Submit';
    }
  }
</script>`;
        }
        return '';
    };

    // --- Views ---

    if (view === 'dashboard') {
        return (
            <div className="fb-container">
                <header className="fb-header">
                    <div className="fb-header-left">
                        <Layout size={24} color="#4f46e5" />
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>FormCraft</h1>
                    </div>
                    <button className="fb-btn fb-btn-primary" onClick={createNewForm}>
                        <Plus size={18} style={{ marginRight: '0.5rem' }} /> Create New Form
                    </button>
                </header>

                <main className="fb-dashboard">
                    <div className="fb-dash-header">
                        <div>
                            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>Your Forms</h1>
                            <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>Manage your created forms and get embed codes.</p>
                        </div>
                    </div>

                    {loading && forms.length === 0 ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem' }}>
                            <Loader className="animate-spin" size={32} color="#4f46e5" />
                        </div>
                    ) : forms.length === 0 ? (
                        <div className="fb-empty-state" style={{ backgroundColor: 'white', maxWidth: '40rem', margin: '0 auto' }}>
                            <Layout size={48} color="#d1d5db" style={{ marginBottom: '1rem' }} />
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827' }}>No forms yet</h3>
                            <p>Get started by creating your first form.</p>
                            <div style={{ marginTop: '1.5rem' }}>
                                <button className="fb-btn fb-btn-secondary" onClick={createNewForm}>Create Form</button>
                            </div>
                        </div>
                    ) : (
                        <div className="fb-grid">
                            {forms.map(form => (
                                <div key={form._id} className="fb-card" onClick={() => editForm(form._id)}>
                                    <div className="fb-card-content">
                                        <div className="fb-card-header">
                                            <div className="fb-icon-box">
                                                <Layout size={20} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); fetchSubmissions(form._id); }}
                                                    className="fb-control-btn"
                                                    style={{ opacity: 1 }}
                                                    title="View Submissions"
                                                >
                                                    <BarChart2 size={18} />
                                                </button>
                                                <button
                                                    onClick={(e) => deleteForm(e, form._id)}
                                                    className="fb-control-btn delete"
                                                    style={{ opacity: 1 }}
                                                    title="Delete Form"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="fb-card-title">{form.title}</h3>
                                        <p className="fb-card-desc">{form.description}</p>
                                        <div className="fb-card-footer">
                                            <span>{form.fields.length} Fields</span>
                                            <span className="fb-badge">{new Date(form.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    if (view === 'submissions') {
        return (
            <div className="fb-container">
                <header className="fb-header">
                    <div className="fb-header-left">
                        <button onClick={() => setView('dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Submissions: {currentForm?.title}</h1>
                    </div>
                </header>
                <main className="fb-dashboard">
                    <div className="fb-table-container">
                        {submissions.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                                <p>No submissions yet.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="fb-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            {Object.keys(submissions[0].data).map((key, i) => (
                                                <th key={i}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {submissions.map((sub) => (
                                            <tr key={sub._id}>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    {new Date(sub.submittedAt).toLocaleDateString()} {new Date(sub.submittedAt).toLocaleTimeString()}
                                                </td>
                                                {Object.entries(sub.data).map(([key, value], i) => (
                                                    <td key={i}>
                                                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        );
    }

    // Editor View
    const config = currentForm.designConfig || DEFAULT_DESIGN_CONFIG;

    return (
        <div className="fb-container" style={{ overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Navbar */}
            <header className="fb-header">
                <div className="fb-header-left">
                    <button onClick={() => { saveCurrentForm(true); setView('dashboard'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ height: '1.5rem', width: '1px', backgroundColor: '#e5e7eb' }}></div>
                    <input
                        type="text"
                        value={currentForm.title}
                        onChange={(e) => setCurrentForm({ ...currentForm, title: e.target.value })}
                        className="fb-title-input"
                    />
                </div>

                <div className="fb-tabs">
                    <button
                        onClick={() => { setActiveTab('editor'); setSelectedField(null); }}
                        className={`fb-tab ${activeTab === 'editor' && !selectedField ? 'active' : ''}`}
                    >
                        Editor
                    </button>
                    <button
                        onClick={() => { setActiveTab('design'); setSelectedField(null); }}
                        className={`fb-tab ${activeTab === 'design' ? 'active' : ''}`}
                    >
                        Design
                    </button>
                </div>

                <div className="fb-header-right">
                    <button className="fb-btn fb-btn-secondary" onClick={() => setView('preview')}>
                        <Eye size={18} style={{ marginRight: '0.5rem' }} /> Preview
                    </button>
                    <button className="fb-btn fb-btn-ghost" onClick={() => saveCurrentForm(false)}>
                        <Save size={18} style={{ marginRight: '0.5rem' }} /> Save
                    </button>
                    <button className="fb-btn fb-btn-primary" onClick={() => { saveCurrentForm(true); setShowEmbedModal(true); }}>
                        <Code size={18} style={{ marginRight: '0.5rem' }} /> Embed
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="fb-workspace">
                {/* Sidebar Tools - Left Side */}
                {activeTab === 'editor' && !selectedField && (
                    <div className="fb-sidebar">
                        <div className="fb-sidebar-section">
                            <h2 className="fb-section-title">Form Elements</h2>
                            <div className="fb-tools-grid">
                                <button className="fb-tool-btn" onClick={() => addField('text')}>
                                    <Type className="fb-tool-icon" size={24} />
                                    <span className="fb-tool-label">Text</span>
                                </button>
                                <button className="fb-tool-btn" onClick={() => addField('email')}>
                                    <Mail className="fb-tool-icon" size={24} />
                                    <span className="fb-tool-label">Email</span>
                                </button>
                                <button className="fb-tool-btn" onClick={() => addField('textarea')}>
                                    <AlignLeft className="fb-tool-icon" size={24} />
                                    <span className="fb-tool-label">Textarea</span>
                                </button>
                                <button className="fb-tool-btn" onClick={() => addField('number')}>
                                    <Hash className="fb-tool-icon" size={24} />
                                    <span className="fb-tool-label">Number</span>
                                </button>
                                <button className="fb-tool-btn" onClick={() => addField('checkbox')}>
                                    <CheckSquare className="fb-tool-icon" size={24} />
                                    <span className="fb-tool-label">Checkbox</span>
                                </button>
                                <button className="fb-tool-btn" onClick={() => addField('select')}>
                                    <ChevronDown className="fb-tool-icon" size={24} />
                                    <span className="fb-tool-label">Select</span>
                                </button>
                            </div>
                        </div>

                        <div className="fb-sidebar-section" style={{ marginTop: 'auto', borderTop: '1px solid #e5e7eb' }}>
                            <h3 style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Form Description</h3>
                            <textarea
                                value={currentForm.description}
                                onChange={(e) => setCurrentForm({ ...currentForm, description: e.target.value })}
                                style={{ width: '100%', height: '6rem', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                                placeholder="Describe your form..."
                            />
                        </div>
                    </div>
                )}

                {/* Canvas */}
                <div className="fb-canvas-area" style={{ backgroundColor: '#f3f4f6' }}>
                    <div className="fb-form-preview"
                        style={{
                            maxWidth: config.maxWidth,
                            width: '100%',
                            fontFamily: config.fontFamily,
                            padding: config.padding,
                            minHeight: config.minHeight,
                            backgroundColor: config.backgroundColor,
                            borderRadius: config.borderRadius,
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}>

                        {/* Form Header on Canvas */}
                        <div className="fb-form-header"
                            style={{
                                borderBottom: '1px solid #f3f4f6',
                            }}>
                            <h1 className="fb-form-title" style={{ color: config.titleColor, textAlign: config.textAlign }}>
                                {currentForm.title}
                            </h1>
                            <p className="fb-form-desc" style={{ color: config.textColor, opacity: 0.8, textAlign: config.textAlign, fontSize: config.fontSize }}>
                                {currentForm.description}
                            </p>
                        </div>

                        {/* Form Fields Area */}
                        <div className="fb-fields-container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: '1rem' }}>
                            {currentForm.fields.length === 0 ? (
                                <div className="fb-empty-state" style={{ width: '100%' }}>
                                    <p>Click elements on the left to add them here</p>
                                </div>
                            ) : (
                                currentForm.fields.map((field, index) => (
                                    <div
                                        key={field.id}
                                        onClick={() => { setSelectedField(field); setActiveTab('editor'); }}
                                        className={`fb-field-item ${selectedField?.id === field.id ? 'selected' : ''}`}
                                        style={{
                                            marginBottom: '0',
                                            width: field.width === 'half' ? '48%' : '100%',
                                            position: 'relative' // Needed for absolute positioned controls
                                        }}
                                    >
                                        {/* Field Controls (Hover) */}
                                        <div className="fb-field-controls">
                                            <button onClick={(e) => { e.stopPropagation(); moveField(index, 'up'); }} className="fb-control-btn"><MoveUp size={16} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); moveField(index, 'down'); }} className="fb-control-btn"><MoveDown size={16} /></button>
                                            <button onClick={(e) => removeField(e, field.id)} className="fb-control-btn delete"><Trash2 size={16} /></button>
                                        </div>

                                        {/* Field Render */}
                                        <div style={{
                                            pointerEvents: 'none',
                                            textAlign: 'left',
                                            display: field.type === 'checkbox' ? 'flex' : 'block',
                                            alignItems: field.type === 'checkbox' ? 'center' : 'stretch'
                                        }}>
                                            {field.type !== 'checkbox' && (
                                                <label className="fb-label" style={{ color: config.textColor }}>
                                                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                </label>
                                            )}

                                            {field.type === 'textarea' ? (
                                                <div className="fb-textarea-mock" style={{ borderColor: '#d1d5db', backgroundColor: '#ffffff', minHeight: '80px' }}></div>
                                            ) : field.type === 'checkbox' ? (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <div style={{ height: '1rem', width: '1rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', marginRight: '0.5rem' }}></div>
                                                    <span style={{ fontSize: config.fontSize, color: config.textColor }}>Checkbox description</span>
                                                </div>
                                            ) : field.type === 'select' ? (
                                                <div className="fb-input-mock" style={{ justifyContent: 'space-between', borderColor: '#d1d5db', backgroundColor: '#ffffff', fontSize: config.fontSize }}>
                                                    <span>Select an option</span>
                                                    <ChevronDown size={16} />
                                                </div>
                                            ) : (
                                                <div className="fb-input-mock" style={{ borderColor: '#d1d5db', backgroundColor: '#ffffff', fontSize: config.fontSize }}>
                                                    {field.placeholder || `Enter ${field.label}...`}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div style={{ padding: '2rem', borderTop: '1px solid #f3f4f6', textAlign: config.textAlign }}>
                            <button
                                className="fb-btn"
                                style={{
                                    width: '100%',
                                    backgroundColor: config.buttonColor,
                                    color: 'white',
                                    borderRadius: '0.375rem', // Standard small radius for buttons inside form
                                    fontSize: config.fontSize,
                                }}
                            >
                                Submit
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Properties or Design */}
                <div className="fb-properties-panel">
                    {activeTab === 'design' ? (
                        <div style={{ padding: '1.5rem' }}>
                            <h3 className="fb-section-title">Form Appearance</h3>

                            <div className="fb-prop-group">
                                <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Typography</label>

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Font Family</label>
                                <select
                                    className="fb-input"
                                    value={config.fontFamily}
                                    onChange={(e) => updateDesignConfig('fontFamily', e.target.value)}
                                    style={{ marginBottom: '1rem' }}
                                >
                                    <option value="system-ui, -apple-system, sans-serif">System (Default)</option>
                                    <option value="'Helvetica Neue', Helvetica, Arial, sans-serif">Helvetica / Arial</option>
                                    <option value="'Georgia', serif">Georgia (Serif)</option>
                                    <option value="'Courier New', monospace">Courier (Monospace)</option>
                                    <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                </select>

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Alignment</label>
                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <button
                                        className={`fb-btn fb-btn-secondary ${config.textAlign === 'left' ? 'fb-btn-primary' : ''}`}
                                        onClick={() => updateDesignConfig('textAlign', 'left')}
                                        style={config.textAlign === 'left' ? { backgroundColor: '#e0e7ff', borderColor: '#4f46e5', color: '#4f46e5' } : {}}
                                    >
                                        <AlignLeft size={16} />
                                    </button>
                                    <button
                                        className={`fb-btn fb-btn-secondary ${config.textAlign === 'center' ? 'fb-btn-primary' : ''}`}
                                        onClick={() => updateDesignConfig('textAlign', 'center')}
                                        style={config.textAlign === 'center' ? { backgroundColor: '#e0e7ff', borderColor: '#4f46e5', color: '#4f46e5' } : {}}
                                    >
                                        <AlignCenter size={16} />
                                    </button>
                                    <button
                                        className={`fb-btn fb-btn-secondary ${config.textAlign === 'right' ? 'fb-btn-primary' : ''}`}
                                        onClick={() => updateDesignConfig('textAlign', 'right')}
                                        style={config.textAlign === 'right' ? { backgroundColor: '#e0e7ff', borderColor: '#4f46e5', color: '#4f46e5' } : {}}
                                    >
                                        <AlignRight size={16} />
                                    </button>
                                </div>

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Font Size</label>
                                <select
                                    className="fb-input"
                                    value={config.fontSize}
                                    onChange={(e) => updateDesignConfig('fontSize', e.target.value)}
                                >
                                    <option value="0.875rem">Small</option>
                                    <option value="1rem">Medium (Base)</option>
                                    <option value="1.125rem">Large</option>
                                    <option value="1.25rem">Extra Large</option>
                                </select>
                            </div>

                            <hr style={{ margin: '1.5rem 0', borderColor: '#f3f4f6' }} />

                            <div className="fb-prop-group">
                                <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Colors</label>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Background</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="color"
                                            value={config.backgroundColor}
                                            onChange={(e) => updateDesignConfig('backgroundColor', e.target.value)}
                                            style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                                        />
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{config.backgroundColor}</span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Title Text</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="color"
                                            value={config.titleColor}
                                            onChange={(e) => updateDesignConfig('titleColor', e.target.value)}
                                            style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                                        />
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{config.titleColor}</span>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Body Text</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="color"
                                            value={config.textColor}
                                            onChange={(e) => updateDesignConfig('textColor', e.target.value)}
                                            style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                                        />
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{config.textColor}</span>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Button</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="color"
                                            value={config.buttonColor}
                                            onChange={(e) => updateDesignConfig('buttonColor', e.target.value)}
                                            style={{ width: '2rem', height: '2rem', padding: 0, border: 'none', cursor: 'pointer', borderRadius: '0.25rem' }}
                                        />
                                        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{config.buttonColor}</span>
                                    </div>
                                </div>
                            </div>

                            <hr style={{ margin: '1.5rem 0', borderColor: '#f3f4f6' }} />

                            <div className="fb-prop-group">
                                <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Dimensions</label>

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Width: {config.maxWidth}</label>
                                <input
                                    type="range"
                                    min="300"
                                    max="1200"
                                    step="10"
                                    value={config.maxWidth.endsWith('px') ? parseInt(config.maxWidth) : (parseInt(config.maxWidth) * 16 || 600)}
                                    onChange={(e) => updateDesignConfig('maxWidth', `${e.target.value}px`)}
                                    style={{ width: '100%', marginBottom: '1rem', accentColor: '#4f46e5' }}
                                />

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Min Height: {config.minHeight === 'auto' ? 'Auto' : config.minHeight}</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1000"
                                        step="50"
                                        disabled={config.minHeight === 'auto'}
                                        value={config.minHeight === 'auto' ? 0 : parseInt(config.minHeight)}
                                        onChange={(e) => updateDesignConfig('minHeight', `${e.target.value}px`)}
                                        style={{ flex: 1, accentColor: '#4f46e5', opacity: config.minHeight === 'auto' ? 0.5 : 1 }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <input
                                            type="checkbox"
                                            checked={config.minHeight === 'auto'}
                                            onChange={(e) => updateDesignConfig('minHeight', e.target.checked ? 'auto' : '400px')}
                                            id="auto-height"
                                            style={{ width: '1rem', height: '1rem' }}
                                        />
                                        <label htmlFor="auto-height" style={{ fontSize: '0.75rem', color: '#374151' }}>Auto</label>
                                    </div>
                                </div>

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Padding: {config.padding}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="5"
                                    step="0.5"
                                    value={parseFloat(config.padding) || 1.5}
                                    onChange={(e) => updateDesignConfig('padding', `${e.target.value}rem`)}
                                    style={{ width: '100%', marginBottom: '1rem', accentColor: '#4f46e5' }}
                                />

                                <label style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', marginBottom: '0.25rem' }}>Corner Radius: {config.borderRadius}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="2"
                                    step="0.125"
                                    value={parseFloat(config.borderRadius) || 0.5}
                                    onChange={(e) => updateDesignConfig('borderRadius', `${e.target.value}rem`)}
                                    style={{ width: '100%', accentColor: '#4f46e5' }}
                                />
                            </div>

                            <hr style={{ margin: '1.5rem 0', borderColor: '#f3f4f6' }} />

                            <h3 className="fb-section-title">Use a Preset</h3>
                            <div className="theme-selector">
                                {Object.entries(THEMES).map(([key, theme]) => (
                                    <button
                                        key={key}
                                        onClick={() => setCurrentForm(prev => ({
                                            ...prev,
                                            theme: key,
                                            designConfig: {
                                                ...prev.designConfig,
                                                backgroundColor: theme.bg,
                                                textColor: theme.text,
                                                titleColor: theme.text,
                                                buttonColor: theme.primary,
                                                borderRadius: '0.75rem'
                                            }
                                        }))}
                                        className="theme-option"
                                    >
                                        <div className="theme-color-preview" style={{ backgroundColor: theme.primary }}></div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#374151' }}>{theme.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : selectedField ? (
                        <div style={{ padding: '1.5rem' }}>
                            <div className="fb-panel-header">
                                <h3 style={{ fontWeight: '600', color: '#1f2937' }}>Edit Field</h3>
                                <button onClick={() => setSelectedField(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>&times;</button>
                            </div>

                            <div className="fb-prop-group">
                                <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Label</label>
                                <input
                                    type="text"
                                    value={selectedField.label}
                                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                    className="fb-input"
                                />
                            </div>

                            {selectedField.type !== 'checkbox' && (
                                <div className="fb-prop-group">
                                    <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Placeholder</label>
                                    <input
                                        type="text"
                                        value={selectedField.placeholder}
                                        onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                        className="fb-input"
                                    />
                                </div>
                            )}

                            <div className="fb-prop-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    id="req-check"
                                    checked={selectedField.required}
                                    onChange={(e) => updateField(selectedField.id, { required: e.target.checked })}
                                    style={{ height: '1rem', width: '1rem' }}
                                />
                                <label htmlFor="req-check" style={{ fontSize: '0.875rem', color: '#374151' }}>Required field</label>
                            </div>

                            <div className="fb-prop-group" style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Field Width</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => updateField(selectedField.id, { width: 'full' })}
                                        style={{
                                            flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid',
                                            backgroundColor: selectedField.width === 'full' ? '#eff6ff' : '#ffffff',
                                            borderColor: selectedField.width === 'full' ? '#3b82f6' : '#d1d5db',
                                            color: selectedField.width === 'full' ? '#1d4ed8' : '#374151',
                                            cursor: 'pointer', fontSize: '0.875rem'
                                        }}
                                    >
                                        Full Width
                                    </button>
                                    <button
                                        onClick={() => updateField(selectedField.id, { width: 'half' })}
                                        style={{
                                            flex: 1, padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid',
                                            backgroundColor: selectedField.width === 'half' ? '#eff6ff' : '#ffffff',
                                            borderColor: selectedField.width === 'half' ? '#3b82f6' : '#d1d5db',
                                            color: selectedField.width === 'half' ? '#1d4ed8' : '#374151',
                                            cursor: 'pointer', fontSize: '0.875rem'
                                        }}
                                    >
                                        Half Width
                                    </button>
                                </div>
                            </div>

                            {(selectedField.type === 'select' || selectedField.type === 'radio') && (
                                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
                                    <label className="fb-section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>Options</label>
                                    {selectedField.options.map((opt, idx) => (
                                        <div key={idx} style={{ display: 'flex', marginBottom: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOpts = [...selectedField.options];
                                                    newOpts[idx] = e.target.value;
                                                    updateField(selectedField.id, { options: newOpts });
                                                }}
                                                className="fb-input"
                                                style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
                                            />
                                            <button
                                                onClick={() => {
                                                    const newOpts = selectedField.options.filter((_, i) => i !== idx);
                                                    updateField(selectedField.id, { options: newOpts });
                                                }}
                                                style={{ padding: '0 0.5rem', color: '#dc2626', border: '1px solid #d1d5db', borderLeft: 'none', borderTopRightRadius: '0.375rem', borderBottomRightRadius: '0.375rem', cursor: 'pointer', background: 'white' }}
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => updateField(selectedField.id, { options: [...selectedField.options, `Option ${selectedField.options.length + 1}`] })}
                                        style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                    >
                                        + Add Option
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#9ca3af' }}>
                            <Settings size={48} style={{ margin: '0 auto 1rem', color: '#e5e7eb' }} />
                            <p>Select a field or click on Design to customize.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Embed Modal */}
            {showEmbedModal && (
                <div className="fb-modal-overlay">
                    <div className="fb-modal">
                        <div className="fb-modal-header">
                            <div>
                                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#111827' }}>Embed Form</h3>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Copy the code below to use this form on your website.</p>
                            </div>
                            <button onClick={() => setShowEmbedModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem', color: '#9ca3af' }}>&times;</button>
                        </div>

                        <div className="fb-modal-content">
                            <div className="fb-code-block">
                                <pre>{generateEmbedCode('html')}</pre>
                            </div>
                        </div>

                        <div className="fb-modal-footer">
                            <button className="fb-btn fb-btn-secondary" onClick={() => setShowEmbedModal(false)}>Close</button>
                            <button className="fb-btn fb-btn-primary" onClick={() => {
                                navigator.clipboard.writeText(generateEmbedCode('html'));
                                alert('Code copied to clipboard!');
                            }}>
                                <Copy size={18} style={{ marginRight: '0.5rem' }} /> Copy Code
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Full Screen Preview Modal */}
            {view === 'preview' && (
                <div className="fb-modal-overlay" style={{ backgroundColor: '#111827', overflowY: 'auto', display: 'block', padding: '3rem 1rem' }}>
                    <div style={{ maxWidth: '64rem', margin: '0 auto' }}>
                        <button
                            onClick={() => setView('editor')}
                            style={{ display: 'flex', alignItems: 'center', color: '#fff', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2rem' }}
                        >
                            <ArrowLeft size={20} style={{ marginRight: '0.5rem' }} /> Back to Editor
                        </button>

                        <div style={{
                            maxWidth: config.maxWidth,
                            width: '100%',
                            margin: '0 auto',
                            backgroundColor: config.backgroundColor,
                            border: '1px solid #e5e7eb',
                            borderRadius: config.borderRadius,
                            padding: config.padding,
                            fontFamily: config.fontFamily,
                            minHeight: config.minHeight,
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            color: config.textColor
                        }}>
                            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: config.titleColor, textAlign: config.textAlign }}>{currentForm.title}</h2>
                            <p style={{ marginBottom: '2rem', opacity: 0.8, color: config.textColor, textAlign: config.textAlign, fontSize: config.fontSize }}>{currentForm.description}</p>

                            <form onSubmit={(e) => { e.preventDefault(); alert('This is a preview. No data is sent.'); }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {currentForm.fields.map(field => (
                                        <div key={field.id}>
                                            {field.type !== 'checkbox' && (
                                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', color: config.textColor }}>
                                                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                </label>
                                            )}

                                            {/* Field Rendering matches design config */}
                                            {field.type === 'textarea' ? (
                                                <textarea
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem 1rem',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '0.5rem',
                                                        backgroundColor: '#ffffff',
                                                        color: '#1f2937',
                                                        minHeight: '100px',
                                                        fontSize: config.fontSize
                                                    }}
                                                />
                                            ) : field.type === 'select' ? (
                                                <select
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem 1rem',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '0.5rem',
                                                        backgroundColor: '#ffffff',
                                                        color: '#1f2937',
                                                        fontSize: config.fontSize
                                                    }}
                                                >
                                                    {field.options.map((opt, i) => <option key={i}>{opt}</option>)}
                                                </select>
                                            ) : field.type === 'checkbox' ? (
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <input
                                                        type="checkbox"
                                                        id={`preview-${field.id}`}
                                                        style={{ height: '1rem', width: '1rem', marginRight: '0.5rem' }}
                                                    />
                                                    <label htmlFor={`preview-${field.id}`} style={{ fontSize: config.fontSize, color: config.textColor }}>
                                                        {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                    </label>
                                                </div>
                                            ) : (
                                                <input
                                                    type={field.type}
                                                    placeholder={field.placeholder}
                                                    required={field.required}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem 1rem',
                                                        border: '1px solid #d1d5db',
                                                        borderRadius: '0.5rem',
                                                        backgroundColor: '#ffffff',
                                                        color: '#1f2937',
                                                        fontSize: config.fontSize
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div style={{ textAlign: config.textAlign }}>
                                    <button
                                        type="submit"
                                        style={{
                                            width: '100%',
                                            marginTop: '2rem',
                                            backgroundColor: config.buttonColor,
                                            color: 'white',
                                            fontWeight: '600',
                                            padding: '0.75rem',
                                            borderRadius: '0.375rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            fontSize: config.fontSize
                                        }}
                                    >
                                        Submit Form
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                            Preview Mode • FormCraft
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
