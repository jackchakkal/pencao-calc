"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Printer,
  Share2,
  History,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
  X
} from "lucide-react";

interface CalculationResult {
  id: string;
  date: string;
  filhos: number;
  rendaPagante: number;
  rendaReceptor: number;
  gastosExtra: number;
  temNecessidadeEspecial: boolean;
  percentualCustomizado: number | null;
  valorMensal: number;
  percentualRenda: number;
  breakdown: {
    basePorFilho: number;
    adicionalNecessidadeEspecial: number;
    rateioGastosExtra: number;
    total: number;
  };
}

export default function CalculadoraPensao() {
  // Form state
  const [filhos, setFilhos] = useState(1);
  const [rendaPagante, setRendaPagante] = useState("");
  const [rendaReceptor, setRendaReceptor] = useState("");
  const [temNecessidadeEspecial, setTemNecessidadeEspecial] = useState(false);
  const [gastosExtra, setGastosExtra] = useState("");
  const [percentualCustomizado, setPercentualCustomizado] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [history, setHistory] = useState<CalculationResult[]>([]);
  const [showRecorrer, setShowRecorrer] = useState(false);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pencao-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newResult: CalculationResult) => {
    const updated = [newResult, ...history].slice(0, 10);
    setHistory(updated);
    localStorage.setItem("pencao-history", JSON.stringify(updated));
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate pensão
  const calcular = () => {
    const renda = parseFloat(rendaPagante.replace(/\./g, "").replace(",", ".")) || 0;
    const rendaRec = parseFloat(rendaReceptor.replace(/\./g, "").replace(",", ".")) || 0;
    const gastos = parseFloat(gastosExtra.replace(/\./g, "").replace(",", ".")) || 0;
    const customPercent = percentualCustomizado
      ? parseFloat(percentualCustomizado.replace(",", ".")) / 100
      : null;

    if (renda <= 0) {
      alert("Por favor, informe a renda do pagante.");
      return;
    }

    // Base: 30% da renda líquida por filho
    let percentualBase = 0.3;
    
    // Se receptor trabalha, oferece desconto
    let descontoReceptor = 0;
    if (rendaRec > 0) {
      // Quanto maior a renda do receptor, menor o percentual
      const ratio = rendaRec / renda;
      if (ratio > 0.5) {
        descontoReceptor = 0.3; // 30% de desconto
      } else if (ratio > 0.25) {
        descontoReceptor = 0.15; // 15% de desconto
      } else if (ratio > 0.1) {
        descontoReceptor = 0.1; // 10% de desconto
      }
    }

    // Aplicar desconto do receptor
    percentualBase = percentualBase * (1 - descontoReceptor);

    // Se tem necessidade especial: +50%
    let adicionalNecessidade = 0;
    if (temNecessidadeEspecial) {
      adicionalNecessidade = percentualBase * 0.5;
    }

    // Percentual total
    let percentualTotal = percentualBase + adicionalNecessidade;
    
    // Aplicar percentual customizado se informado
    if (customPercent && customPercent > 0) {
      percentualTotal = customPercent;
    }

    // Limitar a 50% máximo
    percentualTotal = Math.min(percentualTotal, 0.5);

    // Calcular valor base
    const basePorFilho = (renda * percentualTotal) / filhos;

    // Ratear gastos extraordinários
    const rateioGastos = gastos / filhos;

    // Total
    const valorMensal = basePorFilho + rateioGastos;
    const percentualRenda = (valorMensal / renda) * 100;

    const newResult: CalculationResult = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("pt-BR"),
      filhos,
      rendaPagante: renda,
      rendaReceptor: rendaRec,
      gastosExtra: gastos,
      temNecessidadeEspecial,
      percentualCustomizado: customPercent ? customPercent * 100 : null,
      valorMensal,
      percentualRenda,
      breakdown: {
        basePorFilho,
        adicionalNecessidadeEspecial: rateioGastos > 0 ? basePorFilho * 0.5 : 0,
        rateioGastosExtra: rateioGastos,
        total: valorMensal,
      },
    };

    setResult(newResult);
    saveHistory(newResult);
    setShowRecorrer(false);
  };

  // Handle input change with formatting
  const handleCurrencyInput = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value) {
      value = (parseInt(value) / 100).toFixed(2).replace(".", ",");
      // Add thousand separators
      const parts = value.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      value = parts.join(",");
    }
    setter(value);
  };

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Share function
  const handleShare = async () => {
    if (!result) return;
    
    const text = `Pensão Alimentícia calculada:
• Valor mensal: ${formatCurrency(result.valorMensal)}
• ${result.filhos} filho(s)
• Renda pagante: ${formatCurrency(result.rendaPagante)}

Calculado via Calculadora de Pensão Alimentícia`;

    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch (e) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      alert("Copiado para a área de transferência!");
    }
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("pencao-history");
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 mb-4">
            <Calculator className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Calculadora de Pensão{" "}
            <span className="gradient-text">Alimentícia</span>
          </h1>
          <p className="text-slate-300 text-lg">Calcule o valor justo</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Info className="w-5 h-5 text-cyan-400" />
              Dados para Cálculo
            </h2>

            <div className="space-y-5">
              {/* Número de filhos */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Filho(s)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFilhos(Math.max(1, filhos - 1))}
                    className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xl font-bold transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={filhos}
                    onChange={(e) => setFilhos(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-10 px-4 rounded-lg bg-white/10 border border-white/20 text-white text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <button
                    onClick={() => setFilhos(filhos + 1)}
                    className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xl font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Renda do pagante */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Renda do pai/mãe pagante (R$)
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={rendaPagante}
                  onChange={handleCurrencyInput(setRendaPagante)}
                  className="w-full h-12 px-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                />
              </div>

              {/* Renda do receptor */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Renda do responsável receptor (R$){" "}
                  <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={rendaReceptor}
                  onChange={handleCurrencyInput(setRendaReceptor)}
                  className="w-full h-12 px-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                />
              </div>

              {/* Necessidade especial */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="necessidadeEspecial"
                  checked={temNecessidadeEspecial}
                  onChange={(e) => setTemNecessidadeEspecial(e.target.checked)}
                  className="w-5 h-5 rounded bg-white/10 border-white/20 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0"
                />
                <label htmlFor="necessidadeEspecial" className="text-sm text-slate-300">
                  Filho(s) com necessidade especial
                </label>
              </div>

              {/* Gastos extraordinários */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Gastos extraordinários (R$){" "}
                  <span className="text-slate-500">(escola, médico, etc)</span>
                </label>
                <input
                  type="text"
                  placeholder="0,00"
                  value={gastosExtra}
                  onChange={handleCurrencyInput(setGastosExtra)}
                  className="w-full h-12 px-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                />
              </div>

              {/* Percentual customizado */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Percentual customizado (%){" "}
                  <span className="text-slate-500">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 25"
                  value={percentualCustomizado}
                  onChange={(e) => setPercentualCustomizado(e.target.value.replace(/\D/g, ""))}
                  className="w-full h-12 px-4 rounded-lg bg-white/10 border border-white/20 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all"
                />
              </div>

              {/* Calculate button */}
              <button
                onClick={calcular}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/25"
              >
                Calcular Pensão
              </button>

              {/* History toggle */}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full h-12 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <History className="w-4 h-4" />
                {showHistory ? "Ocultar Histórico" : `Ver Histórico (${history.length})`}
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* History panel */}
            <AnimatePresence>
              {showHistory && history.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-white/10"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-400">Últimos cálculos</span>
                    <button
                      onClick={clearHistory}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {history.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setResult(item);
                          setFilhos(item.filhos);
                          setRendaPagante(item.rendaPagante.toString());
                          setRendaReceptor(item.rendaReceptor.toString());
                          setGastosExtra(item.gastosExtra.toString());
                          setTemNecessidadeEspecial(item.temNecessidadeEspecial);
                          if (item.percentualCustomizado) {
                            setPercentualCustomizado(item.percentualCustomizado.toString());
                          }
                        }}
                        className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">
                            {formatCurrency(item.valorMensal)}
                          </span>
                          <span className="text-xs text-slate-500">{item.filhos} filho(s)</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{item.date}</div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-400" />
              Resultado
            </h2>

            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-6"
                >
                  {/* Main value */}
                  <div className="text-center p-6 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30">
                    <div className="text-sm text-slate-400 mb-2">Valor Mensal</div>
                    <div className="text-4xl md:text-5xl font-bold gradient-text">
                      {formatCurrency(result.valorMensal)}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">
                      {result.percentualRenda.toFixed(1)}% da renda do pagante
                    </div>
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                      Detalhamento
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                        <span className="text-slate-300">Base por filho</span>
                        <span className="text-white font-medium">
                          {formatCurrency(result.breakdown.basePorFilho)}
                        </span>
                      </div>
                      {result.temNecessidadeEspecial && (
                        <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                          <span className="text-slate-300">Adicional necessidade especial</span>
                          <span className="text-white font-medium">
                            +{formatCurrency(result.breakdown.basePorFilho * 0.5)}
                          </span>
                        </div>
                      )}
                      {result.breakdown.rateioGastosExtra > 0 && (
                        <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
                          <span className="text-slate-300">Rateio gastos extraordinários</span>
                          <span className="text-white font-medium">
                            +{formatCurrency(result.breakdown.rateioGastosExtra)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/10">
                        <span className="text-white font-semibold">Total</span>
                        <span className="text-white font-bold">
                          {formatCurrency(result.breakdown.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      Este é um cálculo orientativo. O valor definitivo pode variar conforme
                      decisão judicial. Considere buscar orientação jurídica.
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={handlePrint}
                      className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </button>
                    <button
                      onClick={handleShare}
                      className="flex-1 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Share2 className="w-4 h-4" />
                      Compartilhar
                    </button>
                  </div>

                  {/* Recorrer button */}
                  <button
                    onClick={() => setShowRecorrer(!showRecorrer)}
                    className="w-full h-11 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4" />
                    Discorda do valor? Veja como recorrer
                    {showRecorrer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showRecorrer && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-4 rounded-xl bg-white/5 space-y-3"
                      >
                        <p className="text-sm text-slate-300">
                          Se discorda do valor calculado, você pode:
                        </p>
                        <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
                          <li>Entrar com ação de modificação de pensão</li>
                          <li>Apresentar comprovantes de gastos reais</li>
                          <li>Argumentar sobre mudança de situação financeira</li>
                          <li>Solicitar audiência de conciliação</li>
                        </ul>
                        <p className="text-sm text-slate-400 pt-2">
                          <strong>Importante:</strong> Procure um advogado para orientação específica
                          para seu caso.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Calculator className="w-10 h-10 text-slate-500" />
                  </div>
                  <p className="text-slate-400">
                    Preencha os dados ao lado e clique em &quot;Calcular Pensão&quot;
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-8 text-slate-500 text-sm"
        >
          <p>Calculadora de Pensão Alimentícia © 2024</p>
          <p className="text-xs mt-1">Valores meramente orientativos</p>
        </motion.footer>
      </div>
    </div>
  );
}
