import PageHeader from '../../components/layout/PageHeader';
import SymptomChatbotWidget from '../../features/patients/components/SymptomChatbotWidget';

const ChatbotPage = () => {
  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="AI assistant"
        title="Symptom chatbot"
        description="Describe symptoms to get safe pre-consultation guidance. AI suggestions are assistive only and must be reviewed by a doctor before any diagnosis or treatment decision."
      />

      <SymptomChatbotWidget />
    </section>
  );
};

export default ChatbotPage;
