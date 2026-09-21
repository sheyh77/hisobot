import { useLanguage } from "../context/LanguageContext";

const LoadingScreen = () => {
  const { t } = useLanguage();

  return <div className="loading-screen" role="status" aria-live="polite">
    <div className="loading-orbit" aria-hidden="true"><span /><span /><span /></div>
    <div className="loading-brand">Moliyam</div>
    <p>{t("loading")}</p>
  </div>;
};

export default LoadingScreen;
