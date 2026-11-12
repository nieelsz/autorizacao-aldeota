// Escreve os dados sobre o PDF original. Coordenadas medidas no modelo (A4, 595x842, origem no topo).
async function gerarPdf(PDFLib, modeloBytes, d) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdf = await PDFDocument.load(modeloBytes);
  const pg = pdf.getPages()[0];
  const H = pg.getHeight();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const cor = rgb(0, 0, 0);

  // corta o texto para caber na largura (não invade a célula vizinha)
  const caber = (t, max, size, f) => {
    t = String(t || '');
    while (t && f.widthOfTextAtSize(t, size) > max) t = t.slice(0, -1);
    return t;
  };
  const txt = (t, x, top, max, size = 9, f = font) => {
    t = caber(t, max, size, f);
    if (t) pg.drawText(t, { x, y: H - top - size * 0.72, size, font: f, color: cor });
  };
  const quebrar = (t, max, size) => {
    const linhas = [];
    for (const par of String(t || '').split('\n')) {
      let l = '';
      for (const w of par.split(/\s+/).filter(Boolean)) {
        const tenta = l ? l + ' ' + w : w;
        if (font.widthOfTextAtSize(tenta, size) <= max) l = tenta;
        else { if (l) linhas.push(l); l = w; }
      }
      linhas.push(l);
    }
    return linhas;
  };

  txt(d.loja, 129, 63, 325, 9, bold);
  txt(d.luc, 510, 66, 58, 8, bold);

  const caixas = {
    'ELÉTRICA': [30, 160], 'HIDRÁULICA': [95, 160], 'CONSTRUÇÃO CIVIL': [169, 160],
    'MARCENARIA': [278, 160], 'PINTURA': [369, 160], 'TELEFONIA / INTERNET': [441, 160],
    'AR CONDICIONADO': [558, 160], 'ADESIVAGEM': [154, 175], 'BALANÇO / INVENTÁRIO': [263, 175],
    'OUTROS': [403, 175],
  };
  for (const t of d.tipos || []) {
    const c = caixas[t];
    if (c) pg.drawText('X', { x: c[0], y: H - c[1] - 7.5, size: 10, font: bold, color: cor });
  }
  const nomesTipo = (d.tipos || []).map(t => (t === 'OUTROS' && d.outros ? 'OUTROS: ' + d.outros : t));
  txt(nomesTipo.join(', '), 204, 78, 362);

  // 1ª linha continua depois do rótulo "DESCRIÇÃO DETALHADA DA ATIVIDADE:", depois 3 linhas cheias
  const desc = quebrar(d.descricao, 540, 9);
  const vagas = [[175, 192, 390], [28, 208, 540], [28, 223, 540], [28, 238, 540]];
  // shortcut: descrição acima de 4 linhas é cortada; se acontecer, use o verso do papel
  let resto = desc.slice();
  vagas.forEach(([x, top, max]) => {
    if (!resto.length) return;
    const ls = quebrar(resto.join(' '), max, 9);
    txt(ls[0], x, top, max);
    resto = ls.slice(1);
  });

  txt(d.dataIni, 60, 270, 225, 10); txt(d.horaIni, 60, 285, 225, 10);
  txt(d.dataFim, 327, 270, 240, 10); txt(d.horaFim, 327, 285, 240, 10);

  txt(d.empresa, 118, 303, 295); txt(d.empresaTel, 440, 303, 128);
  txt(d.responsavel, 125, 319, 288); txt(d.responsavelRg, 435, 319, 133);

  const linhas = [349, 364, 380, 395, 410, 425, 441, 456, 471, 486];
  (d.pessoas || []).slice(0, 10).forEach((p, i) => {
    txt(p.nome, 42, linhas[i], 370);
    txt(p.doc, 422, linhas[i], 146);
  });

  txt(d.solicitante, 192, 606, 375);
  txt(d.fone, 296, 632, 270, 10);
  if (d.assinatura) {
    const img = d.assinatura.startsWith('data:image/png')
      ? await pdf.embedPng(d.assinatura) : await pdf.embedJpg(d.assinatura);
    const s = Math.min(250 / img.width, 34 / img.height);
    const w = img.width * s, h = img.height * s;
    pg.drawImage(img, { x: 157 - w / 2, y: H - 650, width: w, height: h });
  }
  return pdf.save();
}
if (typeof module !== 'undefined') module.exports = gerarPdf;
