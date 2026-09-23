import React, { useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { uploadTabular, uploadImages } from '../../services/api';

const DataIngestion = () => {
    const [tabularFile, setTabularFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleTabularUpload = async (e) => {
        const file = e.target.files[0];
        setTabularFile(file);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await uploadTabular(formData);
            setPreview(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6 bg-slate-900 rounded-lg text-slate-100 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Data Ingestion</h2>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="border-2 border-dashed border-slate-600 p-6 rounded text-center cursor-pointer hover:bg-slate-800 transition relative">
                    <input type="file" onChange={handleTabularUpload} accept=".csv,.xlsx" className="hidden" id="tabUpload" />
                    <label htmlFor="tabUpload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud size={40} className="mb-2 text-indigo-400" />
                        <span className="font-semibold">Upload Tabular Data (CSV/XLSX)</span>
                        {tabularFile && (
                            <span className="mt-3 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full truncate max-w-full">
                                {tabularFile.name}
                            </span>
                        )}
                    </label>
                </div>

                <div className="border-2 border-dashed border-slate-600 p-6 rounded text-center cursor-pointer hover:bg-slate-800 transition relative">
                    <input type="file" onChange={(e) => setImageFile(e.target.files[0])} accept=".zip,.png,.jpg,.jpeg" className="hidden" id="imgUpload" />
                    <label htmlFor="imgUpload" className="cursor-pointer flex flex-col items-center">
                        <UploadCloud size={40} className="mb-2 text-indigo-400" />
                        <span className="font-semibold">Upload Image Data (.zip or images)</span>
                        {imageFile && (
                            <span className="mt-3 bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full truncate max-w-full">
                                {imageFile.name}
                            </span>
                        )}
                    </label>
                </div>
            </div>

            {preview && (
                <div className="mt-6 p-4 bg-slate-800 rounded">
                    <h3 className="font-semibold mb-2">Tabular Preview</h3>
                    <p className="text-sm text-slate-400">File: {preview.filename} ({preview.row_count} rows)</p>
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                        {preview.columns.map((col) => (
                            <span key={col} className="bg-slate-700 px-2 py-1 rounded text-xs">{col}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataIngestion;
