"""
Gerador de Manual do Usuário em PDF
------------------------------------
Preencha as variáveis abaixo para cada cliente e execute:
    python gerar_manual.py
"""

# ═══════════════════════════════════════════════════════
# PREENCHA AQUI PARA CADA CLIENTE
# ═══════════════════════════════════════════════════════
NOME_ORGANIZACAO  = "União Joaquinense 300"
URL_SITE          = "https://uniaojoaquinense.github.io"
URL_ADMIN         = "https://uniaojoaquinense.github.io/admin/"
PASTA_IMAGENS     = r"C:\Users\migue\Documents\repos\uniaojoaquinense.github.io\docs"
ARQUIVO_SAIDA     = "manual_uniao_joaquinense.pdf"
# ═══════════════════════════════════════════════════════

import os
import sys

def verificar_dependencias():
    try:
        import weasyprint
    except ImportError:
        print("Instalando dependências...")
        os.system(f"{sys.executable} -m pip install --user weasyprint")

def imagem(nome_arquivo):
    """Retorna o caminho absoluto da imagem como URI para HTML."""
    caminho = os.path.join(PASTA_IMAGENS, nome_arquivo).replace("\\", "/")
    return f"file:///{caminho}"

def gerar_html():
    conteudo_html = f"""
    <h2><span class="num">1</span> Gerenciando Links</h2>
    <p>
      Na aba <strong>Links</strong> você pode cadastrar e organizar todo o conteúdo do site.<br>
      O site exibe dois tipos de botões:
    </p>
    <ul>
      <li><strong>Categorias</strong> → botões amarelos principais</li>
      <li><strong>Subcategorias</strong> → botões amarelos escuros, dentro de uma categoria</li>
    </ul>
    <p>
      Para adicionar um link, preencha a Categoria, a Subcategoria (opcional), o Nome e a URL do link.<br>
      O <strong>número de ordem</strong> define a posição de exibição — 1 aparece antes do 2.
    </p>
    <img src="{imagem('1.png')}" alt="Cadastro de link">

    <h2><span class="num">2</span> Como fica no site</h2>
    <p>Após salvar, o resultado no site <a href="{URL_SITE}">{URL_SITE}</a> é este:</p>
    <img src="{imagem('2.png')}" alt="Resultado no site">

    <h2><span class="num">3</span> Reorganizando a ordem</h2>
    <p>
      Não se preocupe se cadastrou algo fora de ordem.
      É possível alterar a qualquer momento clicando no botão <strong>Reorganizar</strong>:
    </p>
    <img src="{imagem('3.png')}" alt="Botão reorganizar">
    <p>Ao clicar, surgem as setas de movimento em cada item:</p>
    <img src="{imagem('4.png')}" alt="Modo reorganizar">
    <p>
      Mova os itens com as setas e clique em <strong>Salvar</strong> para confirmar.
      Depois é só dar um <strong>refresh</strong> na página do site.
    </p>
    <img src="{imagem('5.png')}" alt="Salvando a nova ordem">

    <h2><span class="num">4</span> Configurações visuais</h2>
    <p>Na aba <strong>Configurações</strong> você controla a aparência do site:</p>
    <img src="{imagem('6.png')}" alt="Aba de configurações">
    <table>
      <tr><th>Campo</th><th>O que faz</th></tr>
      <tr><td><strong>Handle</strong></td><td>Nome exibido com @ embaixo da logo</td></tr>
      <tr><td><strong>Facebook / Instagram</strong></td><td>URL dos perfis. Se deixar em branco, o botão não aparece</td></tr>
      <tr><td><strong>Logo URL</strong></td><td>Link para uma imagem alternativa da logo</td></tr>
      <tr><td><strong>Imagens do Slider</strong></td><td>Imagens exibidas abaixo da logo (ex: calendário). Até 10 imagens</td></tr>
    </table>

    <h2><span class="num">5</span> Adicionando imagens (logo e slider)</h2>
    <p>Para usar uma imagem do Google Drive:</p>
    <ol>
      <li>Faça upload da imagem no Drive</li>
      <li>Clique com o botão direito → <strong>Compartilhar → Qualquer pessoa com o link → Leitor</strong></li>
      <li>Copie o link e cole no campo correspondente no painel</li>
    </ol>
    <div class="aviso">
      ⚠️ <strong>Imagens precisam estar públicas no Drive</strong> para aparecer no site.<br>
      Já os <strong>links de pastas</strong> não precisam — os membros acessam com o e-mail pessoal deles.
    </div>

    <h2><span class="num">6</span> Controle de acesso</h2>
    <p>
      O acesso ao painel (<a href="{URL_ADMIN}">{URL_ADMIN}</a>) e à edição está vinculado ao <strong>e-mail</strong>.
      Sem o e-mail configurado não é possível fazer login nem salvar alterações.
    </p>
    <p>
      Se algo não funcionar nos links, verifique as <strong>permissões da planilha</strong> —
      ela precisa estar compartilhada com permissão de visualização pública.
    </p>
    <img src="{imagem('7.png')}" alt="Resultado final">
    """

    css = """
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    @page { margin: 40px 50px; }
    @page:first { margin: 0; }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
        font-family: 'Inter', Arial, sans-serif;
        font-size: 13px;
        color: #2c2c2c;
        line-height: 1.7;
        background: #fff;
    }

    /* ── CAPA ─────────────────────────────────────────── */
    .capa {
        background: linear-gradient(135deg, #1a1a1a 0%, #3a2a00 60%, #b8860b 100%);
        color: #fff;
        position: relative;
        width: 210mm;
        height: 297mm;
        margin: 0;
        page-break-after: always;
        overflow: hidden;
    }
    .capa-topo {
        position: absolute;
        top: 50px;
        left: 50px;
        right: 50px;
    }
    .capa .badge {
        display: inline-block;
        background: rgba(255,255,255,0.15);
        color: #f5d77a;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 2px;
        text-transform: uppercase;
        padding: 4px 12px;
        border-radius: 20px;
        border: 1px solid rgba(245,215,122,0.4);
    }
    .capa-topo .ano {
        float: right;
        font-size: 12px;
        color: rgba(255,255,255,0.5);
        font-weight: 500;
        letter-spacing: 1px;
        margin-top: 4px;
    }
    .capa-meio {
        position: absolute;
        top: 50%;
        left: 50px;
        right: 50px;
        margin-top: -80px;
        text-align: center;
    }
    .capa h1 {
        font-size: 32px;
        font-weight: 700;
        color: #fff;
        line-height: 1.3;
        margin: 0 0 10px 0;
        border: none;
        padding: 0;
    }
    .capa-meio .divider {
        width: 60px;
        height: 3px;
        background: #f5ba0a;
        border-radius: 2px;
        margin: 14px auto;
    }
    .capa .org {
        font-size: 18px;
        color: #f5d77a;
        font-weight: 500;
        margin: 0;
    }
    .capa-rodape {
        position: absolute;
        bottom: 50px;
        left: 50px;
        right: 50px;
        border-top: 1px solid rgba(255,255,255,0.2);
        padding-top: 18px;
    }
    .capa .url-box {
        display: inline-block;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.25);
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 12px;
        color: #fff;
    }
    .capa .url-box a { color: #f5d77a; text-decoration: none; }
    .capa .rodape-info {
        float: right;
        font-size: 11px;
        color: rgba(255,255,255,0.4);
        text-align: right;
        margin-top: 4px;
    }

    /* ── CONTEÚDO ─────────────────────────────────────── */
    .conteudo {
        padding: 40px 50px;
        max-width: 100%;
    }

    h2 {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 15px;
        font-weight: 700;
        color: #1a1a1a;
        margin-top: 40px;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ececec;
    }
    h2 .num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        background: linear-gradient(135deg, #f5ba0a, #b8860b);
        color: #1a1a1a;
        font-size: 12px;
        font-weight: 700;
        border-radius: 50%;
        flex-shrink: 0;
    }

    p { margin: 10px 0; color: #3a3a3a; }

    a { color: #9a6e00; font-weight: 500; text-decoration: none; border-bottom: 1px solid #f5ba0a; }

    ul, ol { margin: 10px 0 10px 22px; color: #3a3a3a; }
    li { margin-bottom: 5px; }

    img {
        display: block;
        max-width: 100%;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        margin: 16px 0;
        box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    /* ── TABELA ───────────────────────────────────────── */
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 16px 0;
        border-radius: 8px;
        overflow: hidden;
        font-size: 12.5px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.07);
    }
    th {
        background: linear-gradient(90deg, #f5ba0a, #e0a800);
        color: #1a1a1a;
        padding: 10px 14px;
        text-align: left;
        font-weight: 600;
        font-size: 12px;
        letter-spacing: 0.3px;
    }
    td {
        padding: 9px 14px;
        border-bottom: 1px solid #f0f0f0;
        color: #333;
        vertical-align: top;
    }
    tr:nth-child(even) td { background: #fafafa; }
    tr:last-child td { border-bottom: none; }

    /* ── CALLOUT DE AVISO ─────────────────────────────── */
    .aviso {
        background: #fffbea;
        border-left: 4px solid #f5ba0a;
        border-radius: 0 8px 8px 0;
        padding: 12px 16px;
        margin: 16px 0;
        font-size: 12.5px;
        color: #5a4200;
    }
    .aviso strong { color: #7a5c00; }

    hr { border: none; border-top: 1px solid #eee; margin: 32px 0; }
    """

    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Manual — {NOME_ORGANIZACAO}</title>
  <style>{css}</style>
</head>
<body>

  <div class="capa">
    <div class="capa-topo">
      <span class="badge">Manual do Usu&aacute;rio</span>
      <span class="ano">2025</span>
    </div>
    <div class="capa-meio">
      <h1>Painel Administrativo</h1>
      <div class="divider"></div>
      <p class="org">{NOME_ORGANIZACAO}</p>
    </div>
    <div class="capa-rodape">
      <span class="url-box">&nbsp;&#128279;&nbsp;<a href="{URL_ADMIN}">{URL_ADMIN}</a></span>
      <span class="rodape-info">Manual do Administrador<br>Vers&atilde;o 1.0</span>
    </div>
  </div>

  <div class="conteudo">
    {conteudo_html}
  </div>

</body>
</html>"""


def main():
    verificar_dependencias()
    from weasyprint import HTML

    print(f"Gerando manual para: {NOME_ORGANIZACAO}")
    html = gerar_html()
    HTML(string=html).write_pdf(ARQUIVO_SAIDA)
    print(f"✅ PDF gerado: {ARQUIVO_SAIDA}")


if __name__ == "__main__":
    main()

