import { Link } from "react-router-dom";
import { routeHref } from "../../app/routes.js";

const copy = {
  "pt-BR": {
    note: "Xadrez para jogar, aprender e pensar. Um projeto independente, gratuito e feito para o navegador.",
    links: ["Aprender", "Praticar", "Desafios", "Regras", "Sobre", "Jogar agora"],
    byline: "Feito para quem gosta de xadrez.",
  },
  en: {
    note: "Chess to play, learn and think. An independent, free project built for the browser.",
    links: ["Learn", "Practice", "Challenges", "Rules", "About", "Play now"],
    byline: "Made for people who enjoy chess.",
  },
  es: {
    note: "Ajedrez para jugar, aprender y pensar. Un proyecto independiente, gratuito y creado para el navegador.",
    links: ["Aprender", "Practicar", "Desafíos", "Reglas", "Acerca de", "Jugar ahora"],
    byline: "Hecho para quienes disfrutan del ajedrez.",
  },
  "zh-CN": {
    note: "用于对弈、学习和思考的国际象棋。一个独立、免费的浏览器项目。",
    links: ["学习", "练习", "挑战", "规则", "关于", "开始对局"],
    byline: "为热爱国际象棋的人打造。",
  },
};

const destinations = ["learn", "practice", "challenges", "rules", "about", "play"];

export function SiteFooter({ locale }) {
  const t = copy[locale] ?? copy["pt-BR"];
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="site-footer-top">
          <div>
            <Link className="site-brand" to={routeHref(locale, "home")} reloadDocument>
              <span className="site-brand-mark" aria-hidden="true">♞</span>
              <span className="site-brand-name">
                <span className="site-brand-title">3dXess</span>
                <span className="site-brand-badge">Online</span>
                <small>Xadrez 3D no navegador</small>
              </span>
            </Link>
            <p className="site-footer-note">{t.note}</p>
          </div>
          <nav className="site-footer-links" aria-label="Links do rodapé">
            {destinations.map((destination, index) => (
              <Link key={destination} to={routeHref(locale, destination)} reloadDocument>
                {t.links[index]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="site-footer-bottom">
          <span>© {new Date().getFullYear()} 3dXess. {t.byline}</span>
          <span>React · Three.js · WebRTC</span>
        </div>
      </div>
    </footer>
  );
}
