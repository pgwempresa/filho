const comments = [
  {
    name: "Ana Paula Ribeiro",
    initials: "AP",
    text: "Eu chorei vendo esse vídeo. Meu filho estava cada dia mais distante de Deus e essa oração me deu uma direção que eu não tinha mais. Comecei hoje e já senti paz no coração.",
    likes: 48,
    time: "2 h",
    replies: [
      {
        name: "Marcia Cristina",
        initials: "MC",
        text: "Ana, aconteceu parecido aqui em casa. Fiz a oração ontem à noite e pela primeira vez em semanas consegui dormir sem aquele aperto.",
        likes: 19,
        time: "42 min",
      },
      {
        name: "Juliana Mendes",
        initials: "JM",
        text: "Também comecei hoje. É simples, mas fala direto com a dor de mãe.",
        likes: 12,
        time: "18 min",
      },
    ],
  },
  {
    name: "Patricia Alves",
    initials: "PA",
    text: "Que explicação abençoada. Não fica enrolando, vai direto no ponto e mostra como fazer a oração pelos filhos. Vou mandar para minha irmã também.",
    likes: 63,
    time: "1 h",
    replies: [],
  },
  {
    name: "Renata Fernandes",
    initials: "RF",
    text: "Sou mãe solo e estava me sentindo sem forças. Essa missionária falou exatamente o que eu precisava ouvir. Obrigada por compartilhar isso com outras mães.",
    likes: 37,
    time: "55 min",
    replies: [],
  },
  {
    name: "Luciana Torres",
    initials: "LT",
    text: "Meu adolescente anda muito fechado, preso no celular e respondendo mal. Fiz a oração com fé e vou continuar pelos próximos dias. Senti esperança de novo.",
    likes: 29,
    time: "31 min",
    replies: [],
  },
  {
    name: "Fernanda Lima",
    initials: "FL",
    text: "Finalmente uma mensagem para mães que estão lutando pelos filhos sem julgamento. A oração é forte e muito bonita.",
    likes: 54,
    time: "12 min",
    replies: [],
  },
];

const ctaDelayMs = 174 * 1000;
const delayedCta = document.querySelector(".primary-cta-delayed");

if (delayedCta) {
  window.setTimeout(() => {
    delayedCta.classList.add("is-visible");
    delayedCta.removeAttribute("aria-hidden");
  }, ctaDelayMs);
}

function renderComment(comment, nested = false) {
  return `
    <article class="${nested ? "comment comment-nested" : "comment"}">
      <div class="avatar" aria-hidden="true">${comment.initials}</div>
      <div class="comment-body">
        <div class="bubble-wrap">
          <div class="bubble">
            <p class="comment-name">${comment.name}</p>
            <p class="comment-text">${comment.text}</p>
          </div>
          <span class="like-badge" aria-label="${comment.likes} curtidas">
            <span class="like-icon">f</span>
            <span>${comment.likes}</span>
          </span>
        </div>
        <div class="comment-actions" aria-label="acoes do comentario">
          <span>Curtir</span><span>·</span><span>Responder</span><span>·</span><span>${comment.time}</span>
        </div>
      </div>
    </article>
  `;
}

document.querySelector("#comments-list").innerHTML = comments
  .map(
    (comment) => `
      <div class="comment-group">
        ${renderComment(comment)}
        ${
          comment.replies.length
            ? `<div class="replies">${comment.replies.map((reply) => renderComment(reply, true)).join("")}</div>`
            : ""
        }
      </div>
    `,
  )
  .join("");
