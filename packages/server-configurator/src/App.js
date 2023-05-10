import React, { useState, useEffect } from "react";
import validator from '@rjsf/validator-ajv8';

import Form from '@rjsf/core';

function App() {
    const [schema, setSchema] = useState(null);
    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetch("/schemas/serverConfig.schema.json")
            .then((response) => response.json())
            .then((schema) => setSchema(schema));
    }, []);

    const handleChange = ({ formData }) => {
        setFormData(formData);
    };

    const handleSubmit = ({ formData }) => {
        console.log("Submitted JSON:", JSON.stringify(formData, null, 2));
    };

    if (!schema) {
        return <div>Loading schema...</div>;
    }

    return (
        <div className="App">
            <h1>JSON Generator</h1>
            <Form
                schema={schema}
                validator={validator}
                formData={formData}
                onChange={handleChange}
                onSubmit={handleSubmit}
            />
            <pre>{JSON.stringify(formData, null, 2)}</pre>
        </div>
    );
}

export default App;
