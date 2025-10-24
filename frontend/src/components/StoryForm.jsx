import { useEffect, useState } from 'react';

const defaultValues = { title: '', description: '', size: '1' };

const StoryForm = ({ onSubmit, onCancel, initialValues, isEditing }) => {
  const [values, setValues] = useState(defaultValues);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialValues) {
      setValues({
        title: initialValues.title || '',
        description: initialValues.description || '',
        size: initialValues.size ? String(initialValues.size) : '1',
      });
    } else {
      setValues({ ...defaultValues });
    }
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!values.title.trim()) {
      setError('Please enter a title.');
      return;
    }

    if (!values.size || Number.isNaN(Number(values.size)) || Number(values.size) <= 0) {
      setError('Size must be a positive number.');
      return;
    }

    setError('');
    try {
      await onSubmit({
        title: values.title.trim(),
        description: values.description.trim(),
        size: Number(values.size),
      });
      if (!isEditing) {
        setValues({ ...defaultValues });
      }
    } catch (err) {
      setError(err.message || 'Failed to save story.');
    }
  };

  const handleCancel = () => {
    setError('');
    setValues({ ...defaultValues });
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{isEditing ? 'Edit story' : 'Add a new story'}</h2>
      <label htmlFor="title">Title</label>
      <input
        id="title"
        name="title"
        type="text"
        value={values.title}
        onChange={handleChange}
        placeholder="Story title"
        required
      />

      <label htmlFor="description">Description</label>
      <textarea
        id="description"
        name="description"
        value={values.description}
        onChange={handleChange}
        placeholder="Describe the story"
        rows={3}
      />

      <label htmlFor="size">Story points</label>
      <input
        id="size"
        name="size"
        type="number"
        min="1"
        value={values.size}
        onChange={handleChange}
        required
      />

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <button type="submit">{isEditing ? 'Save changes' : 'Add story'}</button>
        {isEditing && (
          <button type="button" className="secondary" onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export default StoryForm;
