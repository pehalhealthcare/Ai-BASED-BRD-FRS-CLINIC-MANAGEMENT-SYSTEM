import Input from '../common/Input';
import Select from '../common/Select';
import Textarea from '../common/Textarea';

const PatientForm = ({ form = {}, onChange = () => {}, errors = {} }) => (
  <div className="grid gap-4">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Name</span>
        <Input value={form.firstName || ''} onChange={(event) => onChange('firstName', event.target.value)} />
        {errors.firstName ? <span className="text-xs text-rose-600">{errors.firstName}</span> : null}
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Gender</span>
        <Select value={form.gender || ''} onChange={(event) => onChange('gender', event.target.value)}>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
      </label>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Date of birth</span>
        <Input type="date" value={form.dateOfBirth || ''} onChange={(event) => onChange('dateOfBirth', event.target.value)} />
      </label>
      <label className="grid gap-2 text-sm font-medium text-stone-700">
        <span>Phone</span>
        <Input value={form.phone || ''} onChange={(event) => onChange('phone', event.target.value)} />
      </label>
    </div>
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      <span>Email</span>
      <Input type="email" value={form.email || ''} onChange={(event) => onChange('email', event.target.value)} />
    </label>
    <label className="grid gap-2 text-sm font-medium text-stone-700">
      <span>Address</span>
      <Textarea rows={3} value={form.address || ''} onChange={(event) => onChange('address', event.target.value)} />
    </label>
  </div>
);

export default PatientForm;
