import React from 'react';
import { QuestionPaper } from '@/stores/questionPaperStore';

export interface WatermarkConfig {
  enabled: boolean;
  type: 'draft' | 'confidential' | 'approved' | 'custom';
  customText: string;
  opacity: number;
  position: 'center' | 'diagonal' | 'top' | 'bottom';
  fontSize: 'small' | 'medium' | 'large';
}

interface PaperPreviewProps {
  paper: QuestionPaper;
  watermark?: WatermarkConfig;
}

const PaperPreview: React.FC<PaperPreviewProps> = ({ paper, watermark }) => {
  const getWatermarkText = () => {
    if (!watermark?.enabled) return '';
    switch (watermark.type) {
      case 'draft': return 'DRAFT';
      case 'confidential': return 'CONFIDENTIAL';
      case 'approved': return 'APPROVED';
      case 'custom': return watermark.customText || '';
      default: return '';
    }
  };

  const getWatermarkStyles = (): React.CSSProperties => {
    if (!watermark?.enabled) return {};
    
    const fontSize = watermark.fontSize === 'small' ? '48px' : watermark.fontSize === 'medium' ? '72px' : '96px';
    
    const baseStyles: React.CSSProperties = {
      position: 'absolute',
      color: watermark.type === 'approved' ? 'rgba(34, 197, 94, ' + (watermark.opacity / 100) + ')' : 
             watermark.type === 'confidential' ? 'rgba(239, 68, 68, ' + (watermark.opacity / 100) + ')' :
             'rgba(100, 100, 100, ' + (watermark.opacity / 100) + ')',
      fontSize,
      fontWeight: 'bold',
      pointerEvents: 'none',
      userSelect: 'none',
      letterSpacing: '8px',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      zIndex: 10,
    };

    switch (watermark.position) {
      case 'center':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        };
      case 'diagonal':
        return {
          ...baseStyles,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) rotate(-45deg)',
        };
      case 'top':
        return {
          ...baseStyles,
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...baseStyles,
          bottom: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      default:
        return baseStyles;
    }
  };

  return (
    <div 
      className="p-8 min-h-[800px] print:p-0 relative"
      style={{ 
        backgroundColor: paper.paperColor, 
        color: paper.textColor,
        fontFamily: 'Times New Roman, serif'
      }}
    >
      {/* Watermark */}
      {watermark?.enabled && (
        <div style={getWatermarkStyles()}>
          {getWatermarkText()}
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6 relative z-20">
        <h1 className="text-xl font-bold uppercase">{paper.collegeName}</h1>
        <h2 className="text-base font-semibold">{paper.departmentName}</h2>
        <p className="text-sm">Master of Computer Applications Semester: {paper.semester}</p>
        <p className="text-base font-bold mt-2 uppercase">CONTINUOUS ASSESSMENT TEST – {paper.examType}</p>
      </div>
      
      {/* Course Info */}
      <div className="border-t-2 border-b-2 py-2 my-4 relative z-20" style={{ borderColor: paper.textColor }}>
        <div className="text-center font-semibold">
          {paper.courseCode} – {paper.courseName}
        </div>
      </div>
      
      {/* Time and Marks */}
      <div className="flex justify-between mb-4 text-sm relative z-20">
        <span><strong>Time:</strong> {paper.duration}</span>
        <span><strong>Maximum Marks:</strong> {paper.maxMarks}</span>
      </div>
      
      {/* Instructions */}
      {paper.instructions.length > 0 && (
        <div className="mb-6 relative z-20">
          <h3 className="font-bold text-sm mb-2 underline">INSTRUCTIONS:</h3>
          <ol className="list-decimal list-inside text-sm space-y-1 ml-2">
            {paper.instructions.map((inst, idx) => (
              <li key={idx}>{inst}</li>
            ))}
          </ol>
        </div>
      )}
      
      {/* Course Outcomes */}
      {paper.courseOutcomes.length > 0 && (
        <div className="mb-6 relative z-20">
          <h3 className="font-bold text-sm mb-2">Course Outcome Table:</h3>
          <table className="w-full border text-sm" style={{ borderColor: paper.textColor }}>
            <thead>
              <tr>
                <th className="border px-2 py-1 text-left" style={{ borderColor: paper.textColor }}>COs</th>
                <th className="border px-2 py-1 text-left" style={{ borderColor: paper.textColor }}>At the end of learning this course, students will be able to</th>
              </tr>
            </thead>
            <tbody>
              {paper.courseOutcomes.map((co, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1 font-semibold" style={{ borderColor: paper.textColor }}>{co.code}</td>
                  <td className="border px-2 py-1" style={{ borderColor: paper.textColor }}>{co.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Questions Table */}
      {paper.sections.map((section, sectionIdx) => (
        <div key={section.id} className="mb-6 relative z-20">
          {section.name && (
            <h3 className="font-bold text-sm mb-2">{section.name}</h3>
          )}
          {section.instructions && (
            <p className="text-sm italic mb-2">{section.instructions}</p>
          )}
          
          <table className="w-full border text-sm" style={{ borderColor: paper.textColor }}>
            <thead>
              {/* Keep header background neutral so paper colors look identical across dashboards/themes */}
              <tr style={{ backgroundColor: 'transparent' }}>
                <th className="border px-2 py-1 text-center w-12" style={{ borderColor: paper.textColor }}>Q. No.</th>
                <th className="border px-2 py-1 text-center w-16" style={{ borderColor: paper.textColor }}>Sub Division</th>
                <th className="border px-2 py-1 text-left" style={{ borderColor: paper.textColor }}>Question</th>
                <th className="border px-2 py-1 text-center w-14" style={{ borderColor: paper.textColor }}>Marks</th>
                <th className="border px-2 py-1 text-center w-12" style={{ borderColor: paper.textColor }}>BTL</th>
              </tr>
            </thead>
            <tbody>
              {section.questions.map((question, qIdx) => (
                <React.Fragment key={question.id}>
                  {question.isAlternative && (
                    <tr>
                      <td colSpan={5} className="border px-2 py-1 text-center font-bold" style={{ borderColor: paper.textColor }}>
                        (OR)
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="border px-2 py-1 text-center align-top" style={{ borderColor: paper.textColor }}>
                      {!question.isAlternative && question.questionNo}
                    </td>
                    <td className="border px-2 py-1 text-center align-top" style={{ borderColor: paper.textColor }}>
                      {question.subDivision}
                    </td>
                    <td className="border px-2 py-1 align-top" style={{ borderColor: paper.textColor }}>
                      {question.content}
                    </td>
                    <td className="border px-2 py-1 text-center align-top" style={{ borderColor: paper.textColor }}>
                      {question.marks}
                    </td>
                    <td className="border px-2 py-1 text-center align-top" style={{ borderColor: paper.textColor }}>
                      {question.btl}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      
      {/* Footer */}
      <div className="text-center mt-8 text-sm relative z-20">
        **********
      </div>
    </div>
  );
};

export default PaperPreview;
