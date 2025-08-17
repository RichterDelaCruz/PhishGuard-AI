'use client';

import { AnalyzeResponse } from '@/types/api';
import { formatRiskScore, getRiskColor, getClassificationColor } from '@/lib/utils';

interface ResultsProps {
  result: AnalyzeResponse;
  requestId?: string;
}

export default function Results({ result, requestId }: ResultsProps) {
  const { risk_score, classification, indicators } = result;

  return (
    <div className="space-y-6">
      {/* Risk Score Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analysis Result</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Risk Score */}
          <div className="text-center">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-500">Risk Score</span>
            </div>
            <div className={`text-4xl font-bold ${getRiskColor(risk_score)}`}>
              {formatRiskScore(risk_score)}
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all ${
                  risk_score < 0.3 
                    ? 'bg-green-500' 
                    : risk_score < 0.7 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(risk_score * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Classification */}
          <div className="text-center">
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-500">Classification</span>
            </div>
            <div className="flex justify-center">
              <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium border ${getClassificationColor(classification)}`}>
                {classification.charAt(0).toUpperCase() + classification.slice(1)}
              </span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {classification === 'safe' && 'This content appears to be legitimate'}
              {classification === 'suspicious' && 'This content has some concerning elements'}
              {classification === 'phishing' && 'This content is likely a phishing attempt'}
            </div>
          </div>
        </div>
      </div>

      {/* Indicators Section */}
      {indicators.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Risk Indicators ({indicators.length})
          </h3>
          
          <div className="space-y-3">
            {indicators.map((indicator, index) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {indicator.kind}
                      </span>
                      {indicator.score !== null && indicator.score !== undefined && (
                        <span className={`text-sm font-medium ${getRiskColor(indicator.score)}`}>
                          {formatRiskScore(indicator.score)}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-700 mt-2">
                      {indicator.detail}
                    </p>
                  </div>
                  
                  <div className="ml-4">
                    {indicator.score !== null && indicator.score !== undefined && (
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            indicator.score < 0.3 
                              ? 'bg-green-500' 
                              : indicator.score < 0.7 
                              ? 'bg-yellow-500' 
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(indicator.score * 100, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Info */}
      {requestId && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <details>
            <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900">
              Debug Information
            </summary>
            <div className="mt-2 text-xs text-gray-600 font-mono">
              <div>Request ID: {requestId}</div>
              <div>Timestamp: {new Date().toISOString()}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
